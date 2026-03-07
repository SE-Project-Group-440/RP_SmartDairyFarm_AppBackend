import express from "express";
import multer from "multer";
import CattleDiseaseController from "../Controllers/CattleDiseaseController.js";
import requireAuth from "../Middleware/UserAuth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /api/cattle/disease/predict
router.post(
  "/disease/predict",
  requireAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "report", maxCount: 1 }
  ]),
  CattleDiseaseController.predictDisease
);

// GET /api/cattle/disease/care/:diseaseType
router.get(
  "/disease/care/:diseaseType",
  requireAuth,
  CattleDiseaseController.getCareInstructions
);

// GET /api/cattle/disease/history - Get user's prediction history
router.get(
  "/disease/history",
  requireAuth,
  CattleDiseaseController.getPredictionHistory
);

// GET /api/cattle/disease/history/cow/:cowId - Get prediction history for a specific cow
router.get(
  "/disease/history/cow/:cowId",
  requireAuth,
  CattleDiseaseController.getCowPredictionHistory
);

// GET /api/cattle/disease/statistics - Get prediction statistics
router.get(
  "/disease/statistics",
  requireAuth,
  CattleDiseaseController.getPredictionStatistics
);

// GET /api/cattle/disease/recent - Get recent predictions (admin functionality)
router.get(
  "/disease/recent",
  requireAuth,
  CattleDiseaseController.getRecentPredictions
);

// GET /api/cattle/disease/severity/:severity - Get predictions by severity
router.get(
  "/disease/severity/:severity",
  requireAuth,
  CattleDiseaseController.getPredictionsBySeverity
);

// GET /api/cattle/disease/severity-stats - Get severity statistics
router.get(
  "/disease/severity-stats",
  requireAuth,
  CattleDiseaseController.getSeverityStatistics
);

export default router;
