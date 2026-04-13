import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// RetrainingBatch  –  one lifecycle record per retraining cycle
// ─────────────────────────────────────────────────────────────────────────────
const retrainingBatchSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, unique: true },  // e.g. "batch_20240101_001"

    // ── Pool stats at batch creation time ───────────────────────────────────
    totalSamplesInPool:   { type: Number, required: true },
    samplesSelectedForSpotCheck: { type: Number, required: true },
    spotCheckSampleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "TrainingPool" }],

    // ── Thresholds used for this batch ───────────────────────────────────────
    confidenceThresholdUsed:    { type: Number, required: true },
    crossModalThresholdUsed:    { type: Number, required: true },
    poolSizeThresholdUsed:      { type: Number, required: true },

    // ── Vet spot-check outcome ────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["awaiting_spot_check", "spot_check_in_progress", "approved", "rejected", "retrained", "failed"],
      default: "awaiting_spot_check",
    },
    spotCheckApprovedCount: { type: Number, default: 0 },
    spotCheckRejectedCount: { type: Number, default: 0 },
    vetDecision:   { type: String,  enum: ["approved", "rejected", null], default: null },
    vetId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    vetComment:    { type: String, required: false },
    decidedAt:     { type: Date,   required: false },

    // ── Retraining outcome ───────────────────────────────────────────────────
    retrainingTriggeredAt:  { type: Date, required: false },
    retrainingCompletedAt:  { type: Date, required: false },
    newModelVersion:        { type: String, required: false },
    newModelAccuracy:       { type: Number, required: false },  // 0-1
    previousModelAccuracy:  { type: Number, required: false },

    // ── On rejection: new threshold tightened ────────────────────────────────
    thresholdAdjustment: {
      applied:              { type: Boolean, default: false },
      previousConfidence:   { type: Number,  required: false },
      newConfidence:        { type: Number,  required: false },
      previousCrossModal:   { type: Number,  required: false },
      newCrossModal:        { type: Number,  required: false },
    },

    errorMessage: { type: String, required: false },
  },
  { timestamps: true }
);

retrainingBatchSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("RetrainingBatch", retrainingBatchSchema);
