import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// TrainingPool  –  stores every candidate sample produced by the pipeline
// ─────────────────────────────────────────────────────────────────────────────
const trainingPoolSchema = new mongoose.Schema(
  {
    // ── Prediction data captured at inference time ──────────────────────────
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiseasePrediction",
      required: false,
    },
    cowId:     { type: String,  required: false },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

    // ── Model outputs ────────────────────────────────────────────────────────
    imagePrediction:    { type: String,  required: false },  // e.g. "FMD"
    imageConfidence:    { type: Number,  required: false },  // 0-1
    symptomPrediction:  { type: String,  required: false },
    symptomConfidence:  { type: Number,  required: false },
    bloodPrediction:    { type: String,  required: false },
    bloodConfidence:    { type: Number,  required: false },
    finalPrediction:    { type: String,  required: true },   // fused decision
    overallConfidence:  { type: Number,  required: true },

    // ── Cross-modal agreement score (0–1) ───────────────────────────────────
    crossModalAgreement: { type: Number, required: true },
    agreementDetails: {
      modalitiesAgreeing:  { type: Number, default: 0 },
      totalModalities:     { type: Number, default: 0 },
      allAgree:            { type: Boolean, default: false },
    },

    // ── Qualification flags ──────────────────────────────────────────────────
    meetsConfidenceThreshold: { type: Boolean, default: false },
    meetsCrossModalThreshold: { type: Boolean, default: false },
    qualifiesForPool:         { type: Boolean, default: false },

    // ── Input metadata (no raw files—just identifiers) ───────────────────────
    inputMetadata: {
      hasImage:   { type: Boolean, default: false },
      hasReport:  { type: Boolean, default: false },
      hasSymptoms: { type: Boolean, default: false },
    },

    // ── Vet review ───────────────────────────────────────────────────────────
    isSpotChecked:     { type: Boolean, default: false },
    spotCheckResult:   { type: String,  enum: ["approved", "rejected", null], default: null },
    vetComment:        { type: String,  required: false },
    vetId:             { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    reviewedAt:        { type: Date,    required: false },

    // ── Retraining lifecycle ─────────────────────────────────────────────────
    retrainingBatchId: { type: String,  required: false },
    usedForRetraining: { type: Boolean, default: false },
    retrainedAt:       { type: Date,    required: false },

    // ── Sample status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "spot_check", "approved", "rejected", "used", "cleared"],
      default: "pending",
    },
  },
  { timestamps: true }
);

trainingPoolSchema.index({ status: 1, createdAt: -1 });
trainingPoolSchema.index({ qualifiesForPool: 1, status: 1 });
trainingPoolSchema.index({ retrainingBatchId: 1 });
trainingPoolSchema.index({ isSpotChecked: 1 });

export default mongoose.model("TrainingPool", trainingPoolSchema);
