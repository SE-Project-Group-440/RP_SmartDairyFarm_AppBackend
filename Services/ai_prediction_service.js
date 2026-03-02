import axios from "axios";

class AiPredictionService {

  async recommend(data) {
    const response = await axios.post(
      "http://10.98.42.24:5001/api/ai/recommend",
      data
    );
    return response.data;
  }

  async predict(data) {
    const response = await axios.post(
      "http://10.98.42.24:5001/api/ai/pregnancy",
      data
    );
    return response.data;
  }
}

export default new AiPredictionService();