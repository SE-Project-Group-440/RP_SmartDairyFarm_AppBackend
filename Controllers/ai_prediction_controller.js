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
        cowId,
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
      const { ai_date } = req.body; // optional, date of AI

      // 1️⃣ Find the recommendation
      const recommendation = await AiRecommendation.findById(recommendationId);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      if (recommendation.status === "COMPLETED") {
        return res.status(400).json({ error: "AI already completed" });
      }

      // 2️⃣ Update status and AI date
      recommendation.status = "COMPLETED";
      if (ai_date) recommendation.ai_date = new Date(ai_date);

      await recommendation.save();

      res.json({
        message: "AI marked as done successfully",
        recommendation
      });
    } catch (err) {
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

}

export default new AiRecommendationController();