import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js" 
import cowRepository from "../Repositories/CowRepository.js"
import mongoose from "mongoose";
import axios from "axios";

class MilkingRecordService {
  create(data) {
    return MilkingRecordRepository.create(data);
  }

  getAll() {
    return MilkingRecordRepository.findAll();
  }

  getByCowId(cowId) {
    return MilkingRecordRepository.findByCowId(cowId);
  }

  getByCycleId(cycleId) {
    return MilkingRecordRepository.findByCycleId(cycleId);
  }

  getOne(id) {
    return MilkingRecordRepository.findById(id);
  }

  update(id, data) {
    return MilkingRecordRepository.update(id, data);
  }

  delete(id) {
    return MilkingRecordRepository.delete(id);
  }

  async createMilkingRecord(data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
     const { cowId, dailyMilk, morning, evening, night, notes,token } = data;

      //console.log("cowId received:", cowId);
      //console.log("is valid:", mongoose.isValidObjectId(cowId));

      const cow = await cowRepository.getById(cowId);

      if (!cow) throw new Error("Cow not found");

      const cycle = await lactationCycleRepository.getLatestByCowId(cowId);
      if (!cycle) throw new Error("No lactation cycle found");

      const lastMilk = await MilkingRecordRepository.getLastMilkingDay(cycle._id);
      if (!lastMilk) throw new Error("No last milk found");
      const nextMilkingDay = lastMilk ? lastMilk.milkingDay + 1 : 1;

      const lactationLength = nextMilkingDay - 1;

      const milkingRecord = await MilkingRecordRepository.create(
        {
          cowId,
          lactationCycle: cycle._id,
          milkingDay: nextMilkingDay,
          date: new Date(),
          dailyMilk,
          morning,
          evening,
          night,
          notes
        },
        { session }
      );

      const Breed_MX = cow.breed === "MX" ? 1 : 0;
      const Breed_Murrha = cow.breed === "Murrah" ? 1 : 0;
      const Breed_NX = cow.breed === "NX" ? 1 : 0;

      const Health_Healthy = cycle.healthStatus === "Healthy" ? 1 : 0;
      const Health_Unhealthy = cycle.healthStatus === "Unhealthy" ? 1 : 0;

      const features = [
        nextMilkingDay,                  // Milking Day
        cycle.lactationRound,            // Lactation Round
        lactationLength,                 // Lactation Length
        cycle.calvingInterval || 0,      // Calving Interval
        cycle.concentratedFoodsKg || 0,  // Concentrated Foods
        cycle.vitaminsG || 0,            // Vitamins
        cycle.mineralsG || 0,            // Minerals
        cow.ageInMonths || 0,            // Age in months
        Breed_MX,
        Breed_Murrha,
        Breed_NX,
        Health_Healthy,
        Health_Unhealthy
      ];

   
      const prediction = await axios.post(
        "http://localhost:5000/api/predict",
        { features },
        {
          headers: {
            Authorization: `Bearer ${token}`,   
          }
        }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        milkingRecord,
        prediction: prediction.data,
        features
      };

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

}

export default new MilkingRecordService();
