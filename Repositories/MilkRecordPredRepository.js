import MilkingRecordPred from "../models/MilkingRecordPred.js";

class MilkingRecordPredRepository {
  async bulkCreate(records, session) {
    return MilkingRecordPred.insertMany(records, { session });
  }

  async getByCowAndCycle(cowId, lactationCycleId) {
    return MilkingRecordPred.find({
      cowId,
      lactationCycle: lactationCycleId,
    }).sort({ milkingDayPred: 1 });
  }
}
b
export default new MilkingRecordPredRepository();
