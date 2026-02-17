import express from "express";
import AnalyticsController from "../Controllers/AnalyticsController.js";

const router = express.Router();

// GET /analytics/cow/:cowId - get full lactation analytics for a cow (latest cycle)
router.get("/cow/:cowId", AnalyticsController.getCowLactationAnalytics);

export default router;
