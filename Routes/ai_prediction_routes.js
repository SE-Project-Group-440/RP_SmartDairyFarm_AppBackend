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
router.put("/update/:recommendationId", AiRecommendationController.updateRecommendation);
router.delete("/delete/:recommendationId", AiRecommendationController.deleteRecommendation);


export default router;