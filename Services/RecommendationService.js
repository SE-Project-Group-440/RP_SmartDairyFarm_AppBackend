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

    return RecommendationRepository.create(
      {
        cowId,
        lactationCycleId,
        milkingRecordId,
        status: recommendation.status,
        title: recommendation.title,
        message: recommendation.message,
        actions: recommendation.actions,
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
