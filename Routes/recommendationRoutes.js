import express from "express";
import RecommendationController from "../Controllers/RecommendationController.js";

const router = express.Router();

router.get(
  "/cow/:cowId/active",
  RecommendationController.getActiveByCow
);


router.get(
  "/all",
  RecommendationController.getAll
);

router.patch(
  "/:id/resolve",
  RecommendationController.resolve
);

export default router;
