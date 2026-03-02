import express from "express";
import { getCattleHeatData } from "../Controllers/CattleHeatController.js";

const router = express.Router();

router.get("/heat-stress", getCattleHeatData);

export default router;