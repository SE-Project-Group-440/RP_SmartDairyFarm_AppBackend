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

}

export default new MilkingRecordRepository();
