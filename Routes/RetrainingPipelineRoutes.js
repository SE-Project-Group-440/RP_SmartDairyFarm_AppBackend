// Routes/RetrainingPipelineRoutes.js
import express from "express";
import RetrainingPipelineController from "../Controllers/RetrainingPipelineController.js";
import requireAuth from "../Middleware/UserAuth.js";

const router = express.Router();

// ── Pipeline overview ─────────────────────────────────────────────────────────
router.get("/status",     requireAuth, RetrainingPipelineController.getStatus);
router.get("/thresholds", requireAuth, RetrainingPipelineController.getThresholds);
router.get("/batches",    requireAuth, RetrainingPipelineController.getBatches);

// ── Batch management ──────────────────────────────────────────────────────────
router.get("/batch/:batchId",                     requireAuth, RetrainingPipelineController.getBatch);
router.get("/batch/:batchId/spot-check",          requireAuth, RetrainingPipelineController.getSpotCheckSamples);

// ── Vet review endpoints ──────────────────────────────────────────────────────
// Review a single sample
router.post("/batch/:batchId/sample/:sampleId/review", requireAuth, RetrainingPipelineController.reviewSample);

// Submit the overall batch decision at once (alternative to per-sample review)
router.post("/batch/:batchId/decision",                requireAuth, RetrainingPipelineController.submitBatchDecision);

export default router;