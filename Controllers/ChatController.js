import axios from "axios";
import FormData from "form-data";

export const askChat = async (req, res) => {
  const { query } = req.body;

  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const response = await axios.post("http://127.0.0.1:8002/chat", { query });
    return res.json({
      answer: response.data.answer,
      audioUri: response.data.audioUri,
    });
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    return res.status(500).json({ error: "Failed to get response from model" });
  }
};


export const speechToText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const formData = new FormData();
    formData.append("audio", req.file.buffer, {
      filename: req.file.originalname || "voice.webm",
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      "http://127.0.0.1:8002/stt",
      formData,
      { headers: formData.getHeaders() }
    );

    return res.json(response.data);
  } catch (err) {
    console.error("STT backend error:", err.message);
    return res.status(500).json({ error: "STT failed" });
  }
};
