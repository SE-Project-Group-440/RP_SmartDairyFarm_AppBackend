import express from "express";
import multer from "multer";
import CattleDiseaseController from "../controllers/CattleDiseaseController.js";
import requireAuth from "../middleware/UserAuth.js";

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

export default router;
