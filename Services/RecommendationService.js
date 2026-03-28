import RecommendationRepository from "../Repositories/RecommendationRepository.js";

class RecommendationService {
  async createRecommendation({
    cowId,
    lactationCycleId,
    milkingRecordId,
    recommendation,
    session,
  }) {
    if (!recommendation) return null;

    // store translation keys rather than raw text so that the frontend can
    // localize the recommendation when rendering.
    // `recommendation.key` corresponds to the status (e.g. "below_expected").
    return RecommendationRepository.create(
      {
        cowId,
        lactationCycleId,
        milkingRecordId,
        status: recommendation.status,
        title: `${recommendation.key}_title`,
        message: `${recommendation.key}_message`,
        actualMilk: recommendation.actualMilk,
        expectedMilk: recommendation.predictedMilk,
        actions: recommendation.actions, // already an array of translation keys
      },
      { session }
    );
  }

  async resolveRecommendation(id) {
    return RecommendationRepository.resolve(id);
  }

  async getActiveByCow(cowId) {
    return RecommendationRepository.findActiveByCow(cowId);
  }

   async getAll() {
    return RecommendationRepository.findAll();
  }
}

// ==========================================
// Recommendation Engine Helper Functions
// ==========================================

function detectTrend(last3Days) {
  if (!last3Days || last3Days.length < 3) return "stable";
  const day1 = last3Days[last3Days.length - 3];
  const day3 = last3Days[last3Days.length - 1];
  
  const diff = day3 - day1;
  if (diff > 1) return "increasing";
  if (diff < -1) return "decreasing";
  return "stable";
}

function getLactationStage(milkingDay) {
  if (milkingDay <= 60) return "Early";
  // Peak overlaps. Prompt says Early: 1-60.
  // We will check in order, so if day is < 45 it's Early. If 45 <= day <= 90 it's Peak.
  if (milkingDay < 45) return "Early";
  if (milkingDay >= 45 && milkingDay <= 90) return "Peak";
  if (milkingDay > 90 && milkingDay <= 200) return "Mid";
  return "Late";
}

export function generateMilkRecommendations({
  actual,
  todayPredictedMilk,
  initialPrediction,
  yesterdayMilk,
  last3Days,
  milkingDay
}) {
  // 1. Actual vs Predicted (today)
  const predicted = todayPredictedMilk || initialPrediction || actual; // fallback to avoid NaN
  const deviation = actual - predicted;
  const deviationPercent = predicted > 0 ? (deviation / predicted) * 100 : 0;

  let status = "on_track";
  if (deviationPercent > 20) {
    status = "above_expected";
  } else if (deviationPercent < -10) {
    status = "below_expected";
  }

  // 2. Actual vs Yesterday
  let yesterdayPercent = 0;
  if (yesterdayMilk && yesterdayMilk > 0) {
    yesterdayPercent = ((actual - yesterdayMilk) / yesterdayMilk) * 100;
  }

  // 3. 3-Day Trend
  const trend = detectTrend(last3Days);

  // 4. Lactation Stage
  const lactationStage = getLactationStage(milkingDay);

  // Color mapping based on status
  let color = "blue";
  let statusKey = "on_track";
  
  if (status === "above_expected") {
    color = "green";
    statusKey = "above_expected";
  } else if (status === "below_expected") {
    color = "orange";
    statusKey = "below_expected";
  }

  // Rule-based Recommendations Mapping
  let actions = [];

  if (status === "above_expected") {
    actions.push("Maintain feeding strategy");
    if (lactationStage === "Peak") {
      actions.push("Provide high-energy feed during peak lactation");
    }
  } else if (status === "on_track") {
    actions.push("Maintain feeding strategy");
  } else if (status === "below_expected") {
    actions.push("Check feed quality");
    actions.push("Monitor cow for illness");
    if (yesterdayPercent < -10) {
      actions.push("Inspect cow health (sudden drop detected)");
    }
  }

  // Unique actions only
  actions = [...new Set(actions)];

  return {
    actualMilk: Number(actual?.toFixed(1) || 0),
    predictedMilk: Number(predicted?.toFixed(1) || 0),
    deviation: Number(deviation?.toFixed(2) || 0),
    deviationPercent: Number(deviationPercent?.toFixed(1) || 0),
    yesterdayPercent: Number(yesterdayPercent?.toFixed(1) || 0),
    trend,
    lactationStage,
    status: statusKey,
    key: statusKey, // used as localization key in store/UI
    color,
    actions // array of string recommendations
  };
}

export default new RecommendationService();
