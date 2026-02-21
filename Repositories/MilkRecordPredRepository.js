import PredictedMilk from "../Models/PredictedMilkModel.js";

class MilkingRecordPredRepository {
  async bulkCreate(records, session) {
    return PredictedMilk.insertMany(records, { session });
  }

  async getByCowAndCycle(cowId, lactationCycleId) {
    return PredictedMilk.find({ cowId, lactationCycle: lactationCycleId }).sort({ milkingDayPred: 1 });
  }

  async updateByCycleAndDay(lactationCycleId, milkingDay, update, session = null) {
    const query = { lactationCycle: lactationCycleId, milkingDayPred: milkingDay };
    if (session) {
      return PredictedMilk.findOneAndUpdate(query, { $set: update }, { new: true, session });
    }
    return PredictedMilk.findOneAndUpdate(query, { $set: update }, { new: true });
  }

  async getByCycle(lactationCycleId) {
    return PredictedMilk.find({ lactationCycle: lactationCycleId }).sort({ milkingDayPred: 1 });
  }
}

export default new MilkingRecordPredRepository();
