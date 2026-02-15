import Recommendation from "../Models/RecomendationModel.js";

class RecommendationRepository {
  create(data, options = {}) {
    return Recommendation.create([data], options).then(r => r[0]);
  }

  findActiveByCow(cowId) {
    return Recommendation.find({
      cowId,
      isResolved: false,
    }).sort({ createdAt: -1 });
  }

   findAll() {
    return Recommendation.find();
  }

  resolve(id) {
    return Recommendation.findByIdAndUpdate(
      id,
      {
        isResolved: true,
        resolvedAt: new Date(),
      },
      { new: true }
    );
  }
}

export default new RecommendationRepository();
