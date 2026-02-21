import express from "express";
import DashboardController from "../Controllers/DashboardController.js";

const DashboardRoute = express.Router();

// GET /dashboard/summary - get today's milk, total cows, and active alerts
DashboardRoute.get("/summary", DashboardController.getDashboardSummary);

export default DashboardRoute;
