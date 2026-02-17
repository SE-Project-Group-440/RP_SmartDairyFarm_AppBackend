import AnalyticsService from "../Services/AnalyticsService.js";

class AnalyticsController {
  async getCowLactationAnalytics(req, res) {
    try {
      const { cowId } = req.params;
      const { cycleId } = req.query;

      if (!cowId) {
        return res.status(400).json({ error: "cowId is required" });
      }

      const result = await AnalyticsService.getCowLactationAnalytics(cowId, cycleId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new AnalyticsController();
