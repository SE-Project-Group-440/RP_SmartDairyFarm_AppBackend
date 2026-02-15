import RecommendationService from "../Services/RecommendationService.js";

class RecommendationController {
  async getActiveByCow(req, res) {
    const { cowId } = req.params;

    const recommendations =
      await RecommendationService.getActiveByCow(cowId);

    res.json(recommendations);
  }

  async getAll(req, res) {
    const { cowId } = req.params;

    const recommendations =
      await RecommendationService.getAll();

    res.json(recommendations);
  }

  async resolve(req, res) {
    const { id } = req.params;

    const recommendation =
      await RecommendationService.resolveRecommendation(id);

    if (!recommendation) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({
      message: "Recommendation marked as resolved",
      recommendation,
    });
  }
}

export default new RecommendationController();
