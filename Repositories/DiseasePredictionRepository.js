import DiseasePrediction from "../Models/DiseasePredictionModel.js";

class DiseasePredictionRepository {
  async create(data) {
    return await DiseasePrediction.create(data);
  }

  async getAll() {
    return await DiseasePrediction.find().populate('userId', 'fname lname email');
  }

  async getById(id) {
    return await DiseasePrediction.findById(id).populate('userId', 'fname lname email');
  }

  async getByUserId(userId, limit = 10) {
    return await DiseasePrediction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'fname lname email');
  }

  async getByCowId(cowId) {
    return await DiseasePrediction.find({ cowId })
      .sort({ createdAt: -1 })
      .populate('userId', 'fname lname email');
  }

  async getByPrediction(prediction) {
    return await DiseasePrediction.find({ prediction })
      .sort({ createdAt: -1 })
      .populate('userId', 'fname lname email');
  }

  async getBySeverity(severity) {
    return await DiseasePrediction.find({ severity })
      .sort({ createdAt: -1 })
      .populate('userId', 'fname lname email');
  }

  async getByPredictionAndSeverity(prediction, severity) {
    return await DiseasePrediction.find({ prediction, severity })
      .sort({ createdAt: -1 })
      .populate('userId', 'fname lname email');
  }

  async getRecentPredictions(days = 7) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    return await DiseasePrediction.find({
      createdAt: { $gte: dateThreshold }
    })
    .sort({ createdAt: -1 })
    .populate('userId', 'fname lname email');
  }

  async update(id, data) {
    return await DiseasePrediction.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await DiseasePrediction.findByIdAndDelete(id);
  }

  // Analytics methods
  async getPredictionStats(userId = null) {
    const matchStage = userId ? { userId: userId } : {};
    
    return await DiseasePrediction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            prediction: "$prediction",
            severity: "$severity"
          },
          count: { $sum: 1 },
          averageConfidence: { $avg: "$confidence" }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  async getSeverityStats(userId = null) {
    const matchStage = userId ? { userId: userId } : {};
    
    return await DiseasePrediction.aggregate([
      { $match: matchStage },
      { $match: { severity: { $ne: null } } }, // Only include records with severity
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
          predictions: { $push: "$prediction" }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  async getMonthlyPredictionTrends(months = 6) {
    const dateThreshold = new Date();
    dateThreshold.setMonth(dateThreshold.getMonth() - months);

    return await DiseasePrediction.aggregate([
      { $match: { createdAt: { $gte: dateThreshold } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            prediction: "$prediction"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
  }
}

export default new DiseasePredictionRepository();