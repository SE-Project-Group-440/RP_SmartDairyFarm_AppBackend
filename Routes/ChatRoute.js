import express from "express";
import { askChat } from "../Controllers/ChatController.js";

const router = express.Router();

// POST /chat
router.post("/", askChat);

export default router;
