import express from "express";
import multer from "multer";
import { speechToText } from "../Controllers/ChatController.js";

const router = express.Router();

// store file in memory (important)
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("audio"), speechToText);

export default router;
