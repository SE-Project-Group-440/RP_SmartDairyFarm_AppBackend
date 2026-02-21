import cowRepository from "../Repositories/CowRepository.js";
import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import RecommendationRepository from "../Repositories/RecommendationRepository.js";

class DashboardController {
  async getDashboardSummary(req, res) {
    try {
      // Get total cow count
      const cows = await cowRepository.getAll();
      const totalCows = cows.length;

      // Get today's total milk production
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayRecords = await MilkingRecordRepository.findAll();
      let todaysMilk = 0;

      for (const record of todayRecords) {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);

        if (recordDate.getTime() === today.getTime()) {
          if (record.dailyMilk) {
            todaysMilk += record.dailyMilk;
          }
        }
      }

      // Get active alerts (recommendations with critical status created today)
      const recommendations = await RecommendationRepository.findAll();
      let activeAlerts = 0;

      for (const rec of recommendations) {
        const recDate = new Date(rec.createdAt || rec.date);
        recDate.setHours(0, 0, 0, 0);

        if (
          recDate.getTime() === today.getTime() &&
          (rec.status === "critical" || rec.severity === "high")
        ) {
          activeAlerts++;
        }
      }

      res.json({
        success: true,
        summary: {
          todaysMilk: Number(todaysMilk.toFixed(2)),
          totalCows,
          activeAlerts,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new DashboardController();
