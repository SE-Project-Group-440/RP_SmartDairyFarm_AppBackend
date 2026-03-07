import express from "express";
import AnalyticsController from "../Controllers/AnalyticsController.js";

const router = express.Router();

// GET /analytics/cow/:cowId - get full lactation analytics for a cow (latest cycle)
router.get("/cow/:cowId", AnalyticsController.getCowLactationAnalytics);

// GET /analytics/cow/:cowId/latest-lactation - get latest lactation cycle with predictions and actuals
router.get("/cow/:cowId/latest-lactation", AnalyticsController.getLatestLactationWithPredictions);

export default router;
