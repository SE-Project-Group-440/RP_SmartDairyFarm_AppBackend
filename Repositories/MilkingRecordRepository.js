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

  findById(id, options = {}) {
    const query = MilkingRecord.findById(id);
    if (options.session) {
      query.session(options.session);
    }
    return query;
  }

  update(id, data, options = {}) {
    return MilkingRecord.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      new: true,
      ...options,
    });
  }

  delete(id) {
    return MilkingRecord.findByIdAndDelete(id);
  }


  getLastMilkingDay(lactationCycleId) {
    return MilkingRecord.findOne({ lactationCycle: lactationCycleId })
      .sort({ milkingDay: -1 });
  }

  getLastMilkingDayMilkingDay(lactationCycleId) {
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

  // return all records for the current day (midnight to 23:59:59)
  getTodayEntries() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return MilkingRecord.find({
      date: { $gte: start, $lte: end },
    })
      .populate("cowId")
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

  async getRecent(limit = 20) {
    return await MilkingRecord.find()
      .sort({ date: -1 })
      .limit(limit)
      .populate("cowId")
      .lean();
  }


}

export default new MilkingRecordRepository();
