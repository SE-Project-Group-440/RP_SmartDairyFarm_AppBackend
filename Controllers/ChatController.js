import axios from "axios";

export const askChat = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    // Forward the query to FastAPI 10.248.75.24
    const response = await axios.post("http://10.248.75.24:8002/chat", { query }, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    return res.json({ answer: response.data.answer });
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    return res.status(500).json({ error: "Failed to get response from model" });
  }
};
