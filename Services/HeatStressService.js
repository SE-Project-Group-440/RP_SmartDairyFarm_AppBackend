import axios from "axios";

export const getHeatPrediction = async (collarId) => {
  try {
    const res = await axios.get(
      `${process.env.FASTAPI_BACKEND}/api/predict/${collarId}`,
      { timeout: 5000 }
    );
    return res.data;
  } catch (error) {
    console.error("ML API error:", error.response?.data || error.message);
    return null;
  }
};