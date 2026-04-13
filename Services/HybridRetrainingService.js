// Services/HybridRetrainingService.js
//
// Implements the hybrid retraining pipeline:
//   1. Every prediction is scored for confidence + cross-modal agreement.
//   2. Qualifying samples accumulate in the TrainingPool.
//   3. When the pool hits POOL_SIZE_THRESHOLD, a random spot-check batch is
//      flagged for vet review (5–10 cases, not all 50).
//   4. Vet approves → retraining proceeds; vet rejects → pool cleared and
//      thresholds are tightened automatically.
//   5. If NO_VET_MODE is enabled, we require unanimous cross-modal agreement
//      (all three modalities must agree) before adding to the pool.

import axios from "axios";
import { trainingPoolRepo, retrainingBatchRepo } from "../Repositories/TrainingPipelineRepository.js";
import { Logger } from "../Utilities/Logger.js";

// ── Tunable defaults (can also come from env / DB config) ────────────────────
const CONFIG = {
  POOL_SIZE_THRESHOLD:       parseInt(process.env.POOL_SIZE_THRESHOLD   || "50"),
  SPOT_CHECK_SIZE:           parseInt(process.env.SPOT_CHECK_SIZE        || "7"),
  CONFIDENCE_THRESHOLD:      parseFloat(process.env.CONFIDENCE_THRESHOLD  || "0.75"),
  CROSS_MODAL_THRESHOLD:     parseFloat(process.env.CROSS_MODAL_THRESHOLD || "0.67"), // 2/3 modalities
  NO_VET_MODE:               process.env.NO_VET_MODE === "true",           // fallback when vet unavailable
  NO_VET_AGREEMENT_REQUIRED: parseFloat(process.env.NO_VET_AGREEMENT     || "1.0"),  // unanimous
  THRESHOLD_TIGHTEN_STEP:    parseFloat(process.env.THRESHOLD_TIGHTEN    || "0.05"),
  MAX_CONFIDENCE_THRESHOLD:  parseFloat(process.env.MAX_CONF_THRESHOLD   || "0.95"),
  FASTAPI_BASE_URL:          process.env.FASTAPI_BACKEND || "http://localhost:8000",
};

// Runtime mutable thresholds (tightened on vet rejection)
let dynamicThresholds = {
  confidence:   CONFIG.CONFIDENCE_THRESHOLD,
  crossModal:   CONFIG.CROSS_MODAL_THRESHOLD,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1.  CROSS-MODAL AGREEMENT SCORING
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computes how many active modalities agree on the same prediction.
 * Returns:
 *   { score: 0–1, modalitiesAgreeing: N, totalModalities: M, allAgree: bool }
 */
function computeCrossModalAgreement(predictionResult) {
  const votes = {};

  const cast = (label, prediction) => {
    if (!prediction || prediction === "Uncertain") return;
    votes[prediction] = (votes[prediction] || 0) + 1;
    return label;
  };

  const active = [
    cast("image",    predictionResult.image_prediction),
    cast("symptoms", predictionResult.symptoms_analysis
      ? topSymptomPrediction(predictionResult.symptoms_analysis)
      : null),
    cast("blood",    predictionResult.blood_analysis?.status === "unhealthy"
      ? inferBloodPrediction(predictionResult)
      : predictionResult.blood_analysis?.status === "healthy"
        ? "Healthy"
        : null),
  ].filter(Boolean);

  const totalModalities = active.length;
  if (totalModalities === 0) return { score: 0, modalitiesAgreeing: 0, totalModalities: 0, allAgree: false };

  const maxVotes = Math.max(...Object.values(votes));
  const score    = maxVotes / totalModalities;

  return {
    score,
    modalitiesAgreeing: maxVotes,
    totalModalities,
    allAgree: maxVotes === totalModalities && totalModalities >= 2,
    voteBreakdown: votes,
  };
}

function topSymptomPrediction(symptomsAnalysis) {
  if (!symptomsAnalysis) return null;
  const entries = Object.entries(symptomsAnalysis);
  if (!entries.length) return null;
  const [disease, score] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return score > 0 ? disease : null;
}

function inferBloodPrediction(predictionResult) {
  // Blood can't distinguish FMD vs LSD on its own; align with image/symptom if they agree
  const imagePred   = predictionResult.image_prediction;
  const symptomPred = topSymptomPrediction(predictionResult.symptoms_analysis);
  if (imagePred && imagePred === symptomPred) return imagePred;
  return imagePred || symptomPred || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.  EVALUATE + STORE CANDIDATE SAMPLE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Called immediately after every disease prediction.
 * Decides whether the sample qualifies for the training pool.
 *
 * @param {Object} predictionResult  - Full AI response from FastAPI
 * @param {Object} meta              - { predictionId, cowId, userId, inputMetadata }
 */
async function evaluateAndStoreSample(predictionResult, meta = {}) {
  try {
    const confidence  = predictionResult.overall_confidence
                     || predictionResult.image_confidence
                     || 0;
    const finalPred   = predictionResult.final_decision
                     || predictionResult.image_prediction
                     || "Uncertain";

    const agreement   = computeCrossModalAgreement(predictionResult);

    // ── Qualification logic ──────────────────────────────────────────────────
    const meetsConf   = confidence >= dynamicThresholds.confidence;
    const meetsModal  = CONFIG.NO_VET_MODE
      ? agreement.allAgree                             
      : agreement.score >= dynamicThresholds.crossModal;

    const qualifies   = meetsConf && meetsModal;

    const sample = await trainingPoolRepo.create({
      predictionId:       meta.predictionId   || null,
      cowId:              meta.cowId          || null,
      userId:             meta.userId         || null,
      imagePrediction:    predictionResult.image_prediction   || null,
      imageConfidence:    predictionResult.image_confidence   || null,
      symptomPrediction:  topSymptomPrediction(predictionResult.symptoms_analysis),
      symptomConfidence:  predictionResult.symptom_confidence || null,
      bloodPrediction:    inferBloodPrediction(predictionResult),
      bloodConfidence:    predictionResult.blood_analysis?.confidence || null,
      finalPrediction:    finalPred,
      overallConfidence:  confidence,
      crossModalAgreement: agreement.score,
      agreementDetails: {
        modalitiesAgreeing: agreement.modalitiesAgreeing,
        totalModalities:    agreement.totalModalities,
        allAgree:           agreement.allAgree,
      },
      meetsConfidenceThreshold: meetsConf,
      meetsCrossModalThreshold: meetsModal,
      qualifiesForPool:         qualifies,
      inputMetadata:            meta.inputMetadata || {},
      status: "pending",
    });

    Logger.info(`[Pipeline] Sample ${sample._id} stored. qualifies=${qualifies} conf=${confidence.toFixed(3)} agreement=${agreement.score.toFixed(3)}`);

    // ── Check whether pool is big enough to trigger a batch ─────────────────
    if (qualifies) {
      await checkAndTriggerBatch();
    }

    return { sampleId: sample._id, qualifies, confidence, agreement };
  } catch (err) {
    Logger.error(`[Pipeline] evaluateAndStoreSample failed: ${err.message}`);
    // Non-fatal – don't crash the prediction response
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  BATCH TRIGGER CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function checkAndTriggerBatch() {
  // Don't start a new batch if one is already awaiting vet review
  const existing = await retrainingBatchRepo.getAwaitingSpotCheck();
  if (existing) {
    Logger.info("[Pipeline] Batch already awaiting vet review — skipping new batch.");
    return;
  }

  const count = await trainingPoolRepo.countQualified();
  Logger.info(`[Pipeline] Qualified pool size: ${count}/${CONFIG.POOL_SIZE_THRESHOLD}`);

  if (count >= CONFIG.POOL_SIZE_THRESHOLD) {
    await createSpotCheckBatch(count);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.  CREATE SPOT-CHECK BATCH
// ─────────────────────────────────────────────────────────────────────────────
async function createSpotCheckBatch(poolCount) {
  try {
    const spotSampleSize = Math.min(
      CONFIG.SPOT_CHECK_SIZE,
      Math.max(5, Math.floor(poolCount * 0.12))   // 12% of pool, min 5
    );

    const randomSamples  = await trainingPoolRepo.getRandomSample(spotSampleSize);
    const sampleIds      = randomSamples.map((s) => s._id);

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const batch = await retrainingBatchRepo.create({
      batchId,
      totalSamplesInPool:            poolCount,
      samplesSelectedForSpotCheck:   spotSampleSize,
      spotCheckSampleIds:            sampleIds,
      confidenceThresholdUsed:       dynamicThresholds.confidence,
      crossModalThresholdUsed:       dynamicThresholds.crossModal,
      poolSizeThresholdUsed:         CONFIG.POOL_SIZE_THRESHOLD,
      status: "awaiting_spot_check",
    });

    await trainingPoolRepo.markAsSpotCheck(sampleIds);

    Logger.info(`[Pipeline] Spot-check batch ${batchId} created. ${spotSampleSize} cases flagged for vet.`);

    // In NO_VET_MODE, auto-approve immediately
    if (CONFIG.NO_VET_MODE) {
      Logger.info("[Pipeline] NO_VET_MODE enabled — auto-approving batch (unanimous agreement required).");
      await processVetDecision(batchId, {
        vetDecision: "approved",
        vetComment: "Auto-approved (no-vet mode, unanimous cross-modal agreement enforced)",
        approvedCount: spotSampleSize,
        rejectedCount: 0,
      });
    }

    return batch;
  } catch (err) {
    Logger.error(`[Pipeline] createSpotCheckBatch failed: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  VET SPOT-CHECK SUBMISSION (per sample)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Called once per sample when vet marks it approved/rejected.
 * When all samples in a batch are reviewed, automatically finalises the batch.
 *
 * @param {string} sampleId
 * @param {Object} review   { result: "approved"|"rejected", vetId, comment }
 */
async function submitSampleReview(sampleId, review) {
  const sample = await trainingPoolRepo.recordVetDecision(sampleId, review);

  // Find the batch this sample belongs to and check if all samples are reviewed
  const batch = await retrainingBatchRepo.getAwaitingSpotCheck();
  if (!batch) return sample;

  const batchSamples = await Promise.all(
    batch.spotCheckSampleIds.map((id) => trainingPoolRepo.getById(id))
  );

  const allReviewed = batchSamples.every((s) => s && s.isSpotChecked && s.spotCheckResult !== null);

  if (allReviewed) {
    const approved = batchSamples.filter((s) => s.spotCheckResult === "approved").length;
    const rejected = batchSamples.filter((s) => s.spotCheckResult === "rejected").length;

    // Overall decision: if >50% of spot-check cases are approved → batch approved
    const vetDecision = approved >= Math.ceil(batchSamples.length / 2) ? "approved" : "rejected";

    await processVetDecision(batch.batchId, {
      vetDecision,
      vetId: review.vetId,
      vetComment: `Spot-check complete: ${approved} approved, ${rejected} rejected.`,
      approvedCount: approved,
      rejectedCount: rejected,
    });
  }

  return sample;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.  PROCESS VET BATCH DECISION
// ─────────────────────────────────────────────────────────────────────────────
async function processVetDecision(batchId, { vetDecision, vetId, vetComment, approvedCount, rejectedCount }) {
  await retrainingBatchRepo.recordVetDecision(batchId, {
    vetDecision, vetId, vetComment, approvedCount, rejectedCount,
  });

  if (vetDecision === "approved") {
    Logger.info(`[Pipeline] Batch ${batchId} approved by vet. Triggering retraining.`);
    await approveAndRetrain(batchId);
  } else {
    Logger.warn(`[Pipeline] Batch ${batchId} rejected by vet. Clearing pool and tightening thresholds.`);
    await rejectAndReset(batchId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7a. APPROVED PATH – trigger retraining
// ─────────────────────────────────────────────────────────────────────────────
async function approveAndRetrain(batchId) {
  try {
    await retrainingBatchRepo.updateStatus(batchId, "retrained", {
      retrainingTriggeredAt: new Date(),
    });

    await trainingPoolRepo.approveAll(batchId);

    // Export the approved pool as a training dataset and call FastAPI
    const approvedSamples = await trainingPoolRepo.getByBatchId(batchId);
    const trainingPayload = buildTrainingPayload(approvedSamples);

    const fastapiUrl = `${CONFIG.FASTAPI_BASE_URL}/api/pipeline/retrain`;
    const response   = await axios.post(fastapiUrl, trainingPayload, { timeout: 60_000 });

    const { model_version, accuracy, previous_accuracy } = response.data;

    await retrainingBatchRepo.recordRetrainingComplete(batchId, {
      newModelVersion:       model_version  || "unknown",
      newModelAccuracy:      accuracy        || null,
      previousModelAccuracy: previous_accuracy || null,
    });

    await trainingPoolRepo.markAsUsed(batchId);

    Logger.info(`[Pipeline] Retraining complete. New model: ${model_version}, accuracy: ${accuracy}`);
  } catch (err) {
    Logger.error(`[Pipeline] Retraining failed for batch ${batchId}: ${err.message}`);
    await retrainingBatchRepo.updateStatus(batchId, "failed", { errorMessage: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7b. REJECTED PATH – clear pool + tighten thresholds
// ─────────────────────────────────────────────────────────────────────────────
async function rejectAndReset(batchId) {
  // Clear the pending pool
  await trainingPoolRepo.clearPool();

  // Tighten both thresholds
  const prevConf   = dynamicThresholds.confidence;
  const prevModal  = dynamicThresholds.crossModal;

  dynamicThresholds.confidence = Math.min(
    prevConf  + CONFIG.THRESHOLD_TIGHTEN_STEP,
    CONFIG.MAX_CONFIDENCE_THRESHOLD
  );
  dynamicThresholds.crossModal = Math.min(
    prevModal + CONFIG.THRESHOLD_TIGHTEN_STEP,
    1.0
  );

  await retrainingBatchRepo.recordThresholdAdjustment(batchId, {
    previousConfidence: prevConf,
    newConfidence:      dynamicThresholds.confidence,
    previousCrossModal: prevModal,
    newCrossModal:      dynamicThresholds.crossModal,
  });

  Logger.warn(
    `[Pipeline] Pool cleared. Thresholds tightened: ` +
    `confidence ${prevConf.toFixed(2)} → ${dynamicThresholds.confidence.toFixed(2)}, ` +
    `crossModal ${prevModal.toFixed(2)} → ${dynamicThresholds.crossModal.toFixed(2)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.  HELPER – build the JSON payload sent to FastAPI for retraining
// ─────────────────────────────────────────────────────────────────────────────
function buildTrainingPayload(samples) {
  return {
    samples: samples.map((s) => ({
      id:                  s._id.toString(),
      label:               s.finalPrediction,
      confidence:          s.overallConfidence,
      crossModalAgreement: s.crossModalAgreement,
      imageConfidence:     s.imageConfidence,
      symptomPrediction:   s.symptomPrediction,
      bloodPrediction:     s.bloodPrediction,
      metadata: {
        cowId:      s.cowId,
        createdAt:  s.createdAt,
        inputMeta:  s.inputMetadata,
      },
    })),
    totalSamples:     samples.length,
    triggeredAt:      new Date().toISOString(),
    thresholdsUsed: {
      confidence: dynamicThresholds.confidence,
      crossModal: dynamicThresholds.crossModal,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9.  STATUS / AUDIT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getPipelineStatus() {
  const [poolStats, latestBatch, qualifiedCount] = await Promise.all([
    trainingPoolRepo.getPoolStats(),
    retrainingBatchRepo.getLatest(),
    trainingPoolRepo.countQualified(),
  ]);

  return {
    qualifiedSamplesInPool: qualifiedCount,
    poolThreshold:          CONFIG.POOL_SIZE_THRESHOLD,
    progressPercent:        Math.min((qualifiedCount / CONFIG.POOL_SIZE_THRESHOLD) * 100, 100).toFixed(1),
    currentThresholds:      dynamicThresholds,
    noVetMode:              CONFIG.NO_VET_MODE,
    poolStats,
    latestBatch: latestBatch
      ? {
          batchId:   latestBatch.batchId,
          status:    latestBatch.status,
          createdAt: latestBatch.createdAt,
          spotCheckSamples: latestBatch.samplesSelectedForSpotCheck,
          vetDecision:      latestBatch.vetDecision,
        }
      : null,
  };
}

async function getSpotCheckSamples(batchId) {
  const batch = await retrainingBatchRepo.getByBatchId(batchId);
  if (!batch) throw { status: 404, message: "Batch not found" };

  const samples = await Promise.all(
    batch.spotCheckSampleIds.map((id) => trainingPoolRepo.getById(id))
  );

  return { batch, samples };
}

export default {
  evaluateAndStoreSample,
  submitSampleReview,
  processVetDecision,
  getPipelineStatus,
  getSpotCheckSamples,
  getDynamicThresholds: () => ({ ...dynamicThresholds }),
};
