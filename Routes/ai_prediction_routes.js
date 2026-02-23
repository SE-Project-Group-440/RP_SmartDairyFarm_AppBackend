import express from "express";
import AiRecommendationController from "../Controllers/ai_prediction_controller.js";

const router = express.Router();

// Recommend next AI date
router.post("/recommend", AiRecommendationController.recommend);

// Mark AI as done → triggers pregnancy prediction
router.post("/done/:recommendationId", AiRecommendationController.markAsDone);
router.get("/pending", AiRecommendationController.getPending);

export default router;