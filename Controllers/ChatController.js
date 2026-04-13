import axios from "axios";
import FormData from "form-data";

import fs from "fs";
import { Readable, PassThrough } from "stream";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { SpeechClient } from "@google-cloud/speech";

import { fileURLToPath } from "url";

// fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const BASE_URL = process.env.FASTAPI_BACKEND;

export const askChat = async (req, res) => {
  const { query } = req.body;

  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const response = await axios.post(`${BASE_URL}/chat`, { query });
    return res.json({
      answer: response.data.answer,
      audioUri: response.data.audioUri,
    });
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    return res.status(500).json({ error: "Failed to get response from model" });
  }
};



const client = new SpeechClient({
  keyFilename: path.join(rootDir, "secrets", "fabled-imagery-457304-q6-c87e0c9cda76.json"),
});

export const speechToText = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Audio file required" });

    // ✅ SET FFMPEG PATH HERE
    ffmpeg.setFfmpegPath(ffmpegStatic);

    const inputStream = new Readable();
    inputStream.push(req.file.buffer);
    inputStream.push(null);

    const outStream = new PassThrough();
    const chunks = [];
    outStream.on('data', chunk => chunks.push(chunk));

    // Convert to WAV LINEAR16 in-memory
    await new Promise((resolve, reject) => {
      ffmpeg(inputStream)
        .outputOptions(["-ar 44100", "-ac 1", "-c:a pcm_s16le"])
        .format("wav")
        .on("end", resolve)
        .on("error", err => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .pipe(outStream, { end: true });
    });

    const audioBytes = Buffer.concat(chunks).toString("base64");

    const [response] = await client.recognize({
      audio: { content: audioBytes },
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 44100,
        languageCode: "si-LK",
      },
    });

    const text = response.results
      .map((r) => r.alternatives[0].transcript)
      .join(" ");

    // No temp files to cleanup

    return res.json({ text });

  } catch (err) {
    console.error("STT failed:", err);
    return res.status(500).json({ error: "STT failed in Node" });
  }
};