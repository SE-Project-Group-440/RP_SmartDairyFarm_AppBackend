import express from "express";
import AiRecommendationController from "../Controllers/ai_prediction_controller.js";

const router = express.Router();

router.post("/recommend", AiRecommendationController.recommend);
router.post("/done/:recommendationId", AiRecommendationController.markAsDone);
router.get("/pending", AiRecommendationController.getPending);
router.get("/all", AiRecommendationController.getAll);
router.post(
  "/confirm-pregnancy/:recommendationId",
  AiRecommendationController.confirmPregnancy
);

export default router;