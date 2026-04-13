import TrainingPool  from "../Models/TrainingPoolModel.js";
import RetrainingBatch from "../Models/RetrainingBatchModel.js";

// ═════════════════════════════════════════════════════════════════════════════
//  TrainingPoolRepository
// ═════════════════════════════════════════════════════════════════════════════
class TrainingPoolRepository {
  // ── Add a new candidate sample ─────────────────────────────────────────────
  async create(data) {
    return await TrainingPool.create(data);
  }

  // ── Count qualified samples ready for the next batch ──────────────────────
  async countQualified() {
    return await TrainingPool.countDocuments({
      qualifiesForPool: true,
      status: "pending",
    });
  }

  // ── Pull a random subset for spot-check ───────────────────────────────────
  async getRandomSample(n = 5) {
    return await TrainingPool.aggregate([
      { $match: { qualifiesForPool: true, status: "pending" } },
      { $sample: { size: n } },
    ]);
  }

  // ── Get all qualified pending samples (for retraining export) ─────────────
  async getAllQualifiedPending() {
    return await TrainingPool.find({ qualifiesForPool: true, status: "pending" });
  }

  // ── Mark a set of samples as spot_check ───────────────────────────────────
  async markAsSpotCheck(ids) {
    return await TrainingPool.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "spot_check", isSpotChecked: true } }
    );
  }

  // ── Record vet decision on an individual sample ────────────────────────────
  async recordVetDecision(id, { result, vetId, comment }) {
    return await TrainingPool.findByIdAndUpdate(
      id,
      {
        $set: {
          spotCheckResult: result,
          vetId,
          vetComment: comment,
          reviewedAt: new Date(),
          status: result === "approved" ? "approved" : "rejected",
        },
      },
      { new: true }
    );
  }

  // ── Approve all pending samples (retraining is a go) ──────────────────────
  async approveAll(batchId) {
    return await TrainingPool.updateMany(
      { qualifiesForPool: true, status: "pending" },
      { $set: { status: "approved", retrainingBatchId: batchId } }
    );
  }

  // ── Mark approved samples as used after retraining ────────────────────────
  async markAsUsed(batchId) {
    return await TrainingPool.updateMany(
      { retrainingBatchId: batchId, status: "approved" },
      { $set: { status: "used", usedForRetraining: true, retrainedAt: new Date() } }
    );
  }

  // ── Clear the pool on rejection ───────────────────────────────────────────
  async clearPool() {
    return await TrainingPool.updateMany(
      { status: "pending" },
      { $set: { status: "cleared" } }
    );
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  async getPoolStats() {
    return await TrainingPool.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgConfidence: { $avg: "$overallConfidence" },
          avgAgreement: { $avg: "$crossModalAgreement" },
        },
      },
    ]);
  }

  async getById(id) {
    return await TrainingPool.findById(id);
  }

  async getByBatchId(batchId) {
    return await TrainingPool.find({ retrainingBatchId: batchId });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  RetrainingBatchRepository
// ═════════════════════════════════════════════════════════════════════════════
class RetrainingBatchRepository {
  async create(data) {
    return await RetrainingBatch.create(data);
  }

  async getById(id) {
    return await RetrainingBatch.findById(id);
  }

  async getByBatchId(batchId) {
    return await RetrainingBatch.findOne({ batchId });
  }

  async getLatest() {
    return await RetrainingBatch.findOne().sort({ createdAt: -1 });
  }

  async getAwaitingSpotCheck() {
    return await RetrainingBatch.findOne({
      status: { $in: ["awaiting_spot_check", "spot_check_in_progress"] },
    }).sort({ createdAt: -1 });
  }

  async updateStatus(batchId, status, extra = {}) {
    return await RetrainingBatch.findOneAndUpdate(
      { batchId },
      { $set: { status, ...extra } },
      { new: true }
    );
  }

  async recordVetDecision(batchId, { vetDecision, vetId, vetComment, approvedCount, rejectedCount }) {
    return await RetrainingBatch.findOneAndUpdate(
      { batchId },
      {
        $set: {
          vetDecision,
          vetId,
          vetComment,
          spotCheckApprovedCount: approvedCount,
          spotCheckRejectedCount: rejectedCount,
          decidedAt: new Date(),
          status: vetDecision === "approved" ? "approved" : "rejected",
        },
      },
      { new: true }
    );
  }

  async recordThresholdAdjustment(batchId, adjustment) {
    return await RetrainingBatch.findOneAndUpdate(
      { batchId },
      { $set: { thresholdAdjustment: { applied: true, ...adjustment } } },
      { new: true }
    );
  }

  async recordRetrainingComplete(batchId, { newModelVersion, newModelAccuracy, previousModelAccuracy }) {
    return await RetrainingBatch.findOneAndUpdate(
      { batchId },
      {
        $set: {
          status: "retrained",
          retrainingCompletedAt: new Date(),
          newModelVersion,
          newModelAccuracy,
          previousModelAccuracy,
        },
      },
      { new: true }
    );
  }

  async getAll(limit = 20) {
    return await RetrainingBatch.find().sort({ createdAt: -1 }).limit(limit);
  }
}

export const trainingPoolRepo    = new TrainingPoolRepository();
export const retrainingBatchRepo = new RetrainingBatchRepository();
