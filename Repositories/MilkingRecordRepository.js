import MilkingRecord from "../Models/MilkingRecordModel.js";

class MilkingRecordRepository {
  create(data) {
    return MilkingRecord.create(data);
  }

  findAll() {
    return MilkingRecord.find();
  }

  findByCowId(cowId) {
    return MilkingRecord.find({ cowId });
  }

  findByCycleId(lactationCycleId) {
    return MilkingRecord.find({ lactationCycleId });
  }

  findById(id) {
    return MilkingRecord.findById(id);
  }

  update(id, data) {
    return MilkingRecord.findByIdAndUpdate(id, data, { new: true });
  }

  delete(id) {
    return MilkingRecord.findByIdAndDelete(id);
  }

  getLastMilkingDay(lactationCycleId) {
    return MilkingRecord.findOne({ lactationCycle: lactationCycleId })
      .sort({ milkingDay: -1 });
  }

  getLastMilkingDay(lactationCycleId) {
    return MilkingRecord.findOne({ lactationCycle: lactationCycleId })
      .sort({ milkingDay: -1 })
      .select("milkingDay")
      .lean();
  }

  getLastMilkingDayByCycleId(cycleId) {
    return MilkingRecord.findOne({ lactationCycle: cycleId })
      .sort({ milkingDay: -1 })
      .select("milkingDay")
      .lean();
  }

  getTodayRecord(cowId, cycleId) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return MilkingRecord.findOne({
      cowId,
      lactationCycle: cycleId,
      date: { $gte: start, $lte: end },
    });
  }


}

export default new MilkingRecordRepository();
