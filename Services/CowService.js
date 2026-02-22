import cowRepository from "../Repositories/CowRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js";
import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import mongoose from "mongoose";

class CowService {
 async createCow(data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      
      const newTagId = await this.generateTagId();

      const cowIdgenrated = `COW-${newTagId.toString().padStart(3, "0")}`;

      const cowData = {
        cowId:cowIdgenrated,
        tagId: newTagId,
        name: data.name || null,
        breed: data.breed || null,
        birthDate: data.birthDate || null,
        ageInMonths: data.ageInMonths || 0,
        color: data.color || null,
        weight: data.weight || 0,
        status: data.status || "Active",
      };

      const cow = await cowRepository.create(cowData, { session });

      const lactationCycle = await lactationCycleRepository.create(
        {
          cowId: cow._id,
          lactationRound: 1,
          calvingDate: null,
          lastCalvingDate: null,
          previousLactationLength: 0,
          calvingInterval: 0,
          concentratedFoodsKg: 0,
          vitaminsG: 0,
          mineralsG: 0,
          healthStatus: "Healthy",
          estimatedDryDate: null,
          actualDryDate: null,
        },
        { session }
      );

      await MilkingRecordRepository.create(
        {
          cowId: cow._id,
          lactationCycle: lactationCycle._id,
          milkingDay: 0,
          date: null,
          dailyMilk: 0,
          morning: 0,
          evening: 0,
          night: 0,
          notes: null,
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        cow,
        lactationCycle,
        message: "Cow created with default lactation + milking record",
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      throw error;
    }
  }

  async getCowLactationHistory(cowId) {
    const cow = await cowRepository.getById(cowId);
    if (!cow) throw new Error("Cow not found");

    const lactations = await lactationCycleRepository.findByCowIdWithMilking(cowId);

    return {
      cow,
      lactationCycles: lactations
    };
  } 



  async getAllCows() {
    return await cowRepository.getAll();

  }

  async getCow(id) {
    return await cowRepository.getById({_id:id});
  }

  async updateCow(id, data) {
    return await cowRepository.update(id, data);
  }

  async deleteCow(id) {
    return await cowRepository.delete(id);
  }

  async generateTagId() {
    const lastCow = await cowRepository.findLastTag();

    if (!lastCow) {
      return 1; 
    }

    return lastCow.tagId + 1;
  }

}

export default new CowService();
