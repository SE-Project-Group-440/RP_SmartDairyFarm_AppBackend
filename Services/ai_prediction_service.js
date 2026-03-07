import axios from "axios";

const BASE_URL = process.env.FASTAPI_BACKEND;
class AiPredictionService {

  async recommend(data) {
    const response = await axios.post(
      `${BASE_URL}/api/ai/recommend`,
      data
    );
    return response.data;
  }

  async predict(data) {
    const response = await axios.post(
      `${BASE_URL}/api/ai/pregnancy`,
      data
    );
    return response.data;
  }
}

export default new AiPredictionService();