import LactationCycle from "../Models/LactationCycleModel.js";

class LactationCycleRepository {
  async create(data, options = {}) {
    return await LactationCycle.create([data], options).then(res => res[0]);
  }

  async findAll() {
    return await LactationCycle.find();
  }

  async findByCowId(cowId) {
    return await LactationCycle.find({ cowId });
  }

  async findById(id) {
    return await LactationCycle.findById(id);
  }

  async update(id, data) {
    return await LactationCycle.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await LactationCycle.findByIdAndDelete(id);
  }
 
  async findByCowIdWithMilking(cowId) {
    return  await LactationCycle.find({ cowId })
      .populate("milkingRecords")          
  }
  
  async getLatestByCowId(cowId) {
    return await LactationCycle.findOne({cowId: cowId })
      .sort({ lactationRound: -1 })  
      .populate("cowId");            
  }

  async getLastCompletedByCowId(cowId) {
  return await LactationCycle.findOne({
    cowId,
    LactationStatus: "Completed",
  })
    .sort({ lactationRound: -1 })
    .lean();
}


}

export default new LactationCycleRepository();
