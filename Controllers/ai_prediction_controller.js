// controllers/aiRecommendationController.js
import AiPredictionService from "../Services/ai_prediction_service.js";
import AiRecommendation from "../Models/ai_prediction_model.js";

class AiRecommendationController {
  // Recommend AI date (original)
  async recommend(req, res) {
    try {
      const { cowId, row } = req.body;

      const result = await AiPredictionService.recommend({ row });

      const saved = await AiRecommendation.create({
        cowId: cowId.toString(),
        input_data: row,
        recommended_next_ai: result.recommended_next_ai,
        status: "PENDING",
        model_version: "v1.0",
      });

      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Mark AI as done and predict pregnancy
  async markAsDone(req, res) {
    try {
      const { recommendationId } = req.params;
      const { ai_date } = req.body;

      const recommendation = await AiRecommendation.findById(recommendationId);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      if (recommendation.status === "COMPLETED") {
        return res.status(400).json({ error: "AI already completed" });
      }

      // 1️⃣ Update status
      recommendation.status = "COMPLETED";
      recommendation.ai_date = new Date(ai_date);

      // 2️⃣ Prepare row for pregnancy model
      const pregnancyPayload = {
        row: {
          ...recommendation.input_data,
          AI_Date: ai_date   // 🔥 VERY IMPORTANT (FastAPI expects this key)
        }
      };

      // 3️⃣ Call FastAPI pregnancy prediction
      const pregnancyResult = await AiPredictionService.predict(pregnancyPayload);

      // 4️⃣ Save pregnancy results
      recommendation.pregnancy_probability = pregnancyResult.pregnancy_probability;
      recommendation.risk_level = pregnancyResult.risk_level;
      recommendation.days_since_ai = pregnancyResult.days_since_ai;
      recommendation.pregnancy_check_date = new Date(pregnancyResult.pregnancy_check_date);

      await recommendation.save();

      res.json({
        message: "AI marked as done and pregnancy predicted",
        recommendation
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }


  async getPending(req, res) {
    try {
      const pendingCows = await AiRecommendation.find({ status: "PENDING" });
      res.json(pendingCows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  async getAll(req, res) {
  try {
    const data = await AiRecommendation.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

}

export default new AiRecommendationController();