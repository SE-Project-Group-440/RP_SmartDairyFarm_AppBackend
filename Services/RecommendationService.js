import RecommendationRepository from "../Repositories/RecommendationRepository.js";

class RecommendationService {
  async createIfCritical({
    cowId,
    lactationCycleId,
    milkingRecordId,
    recommendation,
    session,
  }) {
    if (!recommendation) return null;

    if (recommendation.status !== "below_expected") {
      return null;
    }

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

export default new RecommendationService();
