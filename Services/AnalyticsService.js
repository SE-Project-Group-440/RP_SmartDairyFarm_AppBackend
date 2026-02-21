import MilkRecordPredRepository from "../Repositories/MilkRecordPredRepository.js";
import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js";

class AnalyticsService {
  async getCowLactationAnalytics(cowId, cycleId = null) {
    try {
      let cycle;

      if (cycleId) {
        cycle = await lactationCycleRepository.getById(cycleId);
      } else {
        cycle = await lactationCycleRepository.getLatestByCowId(cowId);
      }

      if (!cycle) {
        return {
          success: false,
          message: "No lactation cycle found for this cow",
          data: null,
        };
      }

      // Get all predictions for this cycle
      const predictions = await MilkRecordPredRepository.getByCycle(cycle._id);

      // Get all actual milking records for this cycle
      const actuals = await MilkingRecordRepository.findByCycleId(cycle._id);

      // Merge predictions with actuals
      const merged = predictions.map((pred) => ({
        milkingDay: pred.milkingDayPred,
        datePred: pred.datePred,
        predictedMilk: pred.dailyMilkPred,
        actualMilk: pred.actualDailyMilk,
        completed: pred.LactationPredStatus === "Completed",
        predId: pred._id,
      }));

      // Calculate totals
      const actualTotal = actuals.reduce((sum, r) => sum + (r.dailyMilk || 0), 0);
      const predictedTotal = predictions.reduce((sum, p) => sum + (p.dailyMilkPred || 0), 0);

      // Calculate averages
      const actualAvg = actuals.length > 0 ? actualTotal / actuals.length : 0;
      const predictedAvg = predictions.length > 0 ? predictedTotal / predictions.length : 0;

      return {
        success: true,
        cycle: {
          _id: cycle._id,
          lactationRound: cycle.lactationRound,
          calvingDate: cycle.calvingDate,
          statusLactation: cycle.LactationStatus,
        },
        data: merged,
        predictions: merged, // alias for compatibility
        summary: {
          totalDays: predictions.length,
          completedDays: actuals.length,
          actualTotal: Number(actualTotal.toFixed(2)),
          predictedTotal: Number(predictedTotal.toFixed(2)),
          actualAvg: Number(actualAvg.toFixed(2)),
          predictedAvg: Number(predictedAvg.toFixed(2)),
          deviation: Number((actualTotal - predictedTotal).toFixed(2)),
          deviationPercent: Number(
            predictedTotal > 0
              ? (((actualTotal - predictedTotal) / predictedTotal) * 100).toFixed(1)
              : 0
          ),
        },
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
        data: null,
      };
    }
  }

  async getLatestLactationWithPredictions(cowId) {
    try {
      const cycle = await lactationCycleRepository.getLatestByCowId(cowId);

      if (!cycle) {
        return {
          success: false,
          message: "No lactation cycle found for this cow",
          data: null,
        };
      }

      // Get all predictions for this cycle
      const predictions = await MilkRecordPredRepository.getByCycle(cycle._id);

      // Get all actual milking records for this cycle
      const actuals = await MilkingRecordRepository.findByCycleId(cycle._id);

      // Merge predictions with actuals, mapping actual milking records to their days
      const actualsByDay = {};
      actuals.forEach((record) => {
        // Match by date or milking day if stored
        const dayKey = record.milkingDay || record.milkingDayPred || 0;
        actualsByDay[dayKey] = (actualsByDay[dayKey] || 0) + (record.dailyMilk || 0);
      });

      const merged = predictions.map((pred) => ({
        milkingDay: pred.milkingDayPred,
        datePred: pred.datePred,
        predictedMilk: pred.dailyMilkPred,
        actualMilk: actualsByDay[pred.milkingDayPred] || 0,
        completed: pred.LactationPredStatus === "Completed",
        predId: pred._id,
      }));

      // Calculate totals
      const actualTotal = actuals.reduce((sum, r) => sum + (r.dailyMilk || 0), 0);
      const predictedTotal = predictions.reduce((sum, p) => sum + (p.dailyMilkPred || 0), 0);

      // Calculate averages
      const actualAvg = actuals.length > 0 ? actualTotal / actuals.length : 0;
      const predictedAvg = predictions.length > 0 ? predictedTotal / predictions.length : 0;

      return {
        success: true,
        lactationCycle: {
          _id: cycle._id,
          lactationRound: cycle.lactationRound,
          calvingDate: cycle.calvingDate,
          startDate: cycle.startDate,
          LactationStatus: cycle.LactationStatus,
          healthStatus: cycle.healthStatus,
          concentratedFoodsKg: cycle.concentratedFoodsKg,
          vitaminsG: cycle.vitaminsG,
          mineralsG: cycle.mineralsG,
        },
        predictions: merged,
        summary: {
          totalDays: predictions.length,
          completedDays: actuals.length,
          actualTotal: Number(actualTotal.toFixed(2)),
          predictedTotal: Number(predictedTotal.toFixed(2)),
          actualAvg: Number(actualAvg.toFixed(2)),
          predictedAvg: Number(predictedAvg.toFixed(2)),
          deviation: Number((actualTotal - predictedTotal).toFixed(2)),
          deviationPercent: Number(
            predictedTotal > 0
              ? (((actualTotal - predictedTotal) / predictedTotal) * 100).toFixed(1)
              : 0
          ),
        },
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
        data: null,
      };
    }
  }
}

export default new AnalyticsService();
