// Controllers/RetrainingPipelineController.js
import HybridRetrainingService from "../Services/HybridRetrainingService.js";
import { retrainingBatchRepo } from "../Repositories/TrainingPipelineRepository.js";
import jwt from "jsonwebtoken";

function getUserId(req) {
  try {
    const token   = (req.headers.authorization || "").replace("Bearer ", "");
    const decoded = jwt.decode(token);
    return decoded?._id || decoded?.id || null;
  } catch {
    return null;
  }
}

class RetrainingPipelineController {

  // ── GET /api/pipeline/status ──────────────────────────────────────────────
  static async getStatus(req, res) {
    try {
      const status = await HybridRetrainingService.getPipelineStatus();
      return res.status(200).json({ success: true, data: status });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── GET /api/pipeline/batches ─────────────────────────────────────────────
  static async getBatches(req, res) {
    try {
      const limit   = parseInt(req.query.limit) || 20;
      const batches = await retrainingBatchRepo.getAll(limit);
      return res.status(200).json({ success: true, data: batches });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── GET /api/pipeline/batch/:batchId/spot-check ───────────────────────────
  // Returns the spot-check samples the vet needs to review
  static async getSpotCheckSamples(req, res) {
    try {
      const { batchId } = req.params;
      const result      = await HybridRetrainingService.getSpotCheckSamples(batchId);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  // ── POST /api/pipeline/batch/:batchId/sample/:sampleId/review ────────────
  // Vet reviews an individual spot-check sample
  // Body: { result: "approved"|"rejected", comment: "..." }
  static async reviewSample(req, res) {
    try {
      const { batchId, sampleId } = req.params;
      const { result, comment }   = req.body;
      const vetId                 = getUserId(req);

      if (!["approved", "rejected"].includes(result)) {
        return res.status(400).json({ success: false, message: "result must be 'approved' or 'rejected'" });
      }

      const updated = await HybridRetrainingService.submitSampleReview(sampleId, {
        result,
        vetId,
        comment: comment || "",
      });

      return res.status(200).json({
        success: true,
        message: `Sample ${result}`,
        data:    updated,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  // ── POST /api/pipeline/batch/:batchId/decision ────────────────────────────
  // Vet submits the overall batch decision in one shot
  // Body: { vetDecision: "approved"|"rejected", comment: "...", approvedCount, rejectedCount }
  static async submitBatchDecision(req, res) {
    try {
      const { batchId }                                       = req.params;
      const { vetDecision, comment, approvedCount = 0, rejectedCount = 0 } = req.body;
      const vetId                                             = getUserId(req);

      if (!["approved", "rejected"].includes(vetDecision)) {
        return res.status(400).json({ success: false, message: "vetDecision must be 'approved' or 'rejected'" });
      }

      await HybridRetrainingService.processVetDecision(batchId, {
        vetDecision,
        vetId,
        vetComment:    comment || "",
        approvedCount: parseInt(approvedCount),
        rejectedCount: parseInt(rejectedCount),
      });

      const updatedBatch = await retrainingBatchRepo.getByBatchId(batchId);
      return res.status(200).json({
        success: true,
        message: `Batch ${vetDecision}. ${vetDecision === "approved" ? "Retraining triggered." : "Pool cleared and thresholds tightened."}`,
        data:    updatedBatch,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  // ── GET /api/pipeline/thresholds ─────────────────────────────────────────
  static async getThresholds(req, res) {
    return res.status(200).json({
      success: true,
      data:    HybridRetrainingService.getDynamicThresholds(),
    });
  }

  // ── GET /api/pipeline/batch/:batchId ─────────────────────────────────────
  static async getBatch(req, res) {
    try {
      const batch = await retrainingBatchRepo.getByBatchId(req.params.batchId);
      if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });
      return res.status(200).json({ success: true, data: batch });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

export default RetrainingPipelineController;
