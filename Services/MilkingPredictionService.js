import mongoose from "mongoose";
import axios from "axios";

import cowRepository from "../Repositories/CowRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js";
import MilkingRecordPredRepository from "../Repositories/MilkRecordPredRepository.js";

class MilkingPredictionService {
  async generateFullLactationPrediction({ cowId, token }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cow = await cowRepository.getById(cowId);
      if (!cow) throw new Error("Cow not found");

      const cycle = await lactationCycleRepository.getLatestByCowId(cowId);
      if (!cycle) throw new Error("No lactation cycle found");

      const predictions = [];
      const startDate = new Date(cycle.startDate || Date.now());

      // Predict for 280 days
      for (let day = 1; day <= 280; day++) {
        const lactationLength = day - 1;

        const Breed_MX = cow.breed === "MX" ? 1 : 0;
        const Breed_Murrha = cow.breed === "Murrah" ? 1 : 0;
        const Breed_NX = cow.breed === "NX" ? 1 : 0;

        const Health_Healthy = cycle.healthStatus === "Healthy" ? 1 : 0;
        const Health_Unhealthy = cycle.healthStatus === "Unhealthy" ? 1 : 0;

        const features = [
          day,
          cycle.lactationRound,
          lactationLength,
          cycle.calvingInterval || 0,
          cycle.concentratedFoodsKg || 0,
          cycle.vitaminsG || 0,
          cycle.mineralsG || 0,
          cow.ageInMonths || 0,
          Breed_MX,
          Breed_Murrha,
          Breed_NX,
          Health_Healthy,
          Health_Unhealthy,
        ];

        
        const response = await axios.post(
          "http://localhost:5000/api/predict",
          { features },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const predictedMilk = response.data.prediction;

        predictions.push({
          cowId,
          lactationCycle: cycle._id,
          milkingDayPred: day,
          datePred: new Date(
            startDate.getTime() + day * 24 * 60 * 60 * 1000
          ),
          dailyMilkPred: predictedMilk,
          dailyMilkPredDone: 0,
          LactationPredStatus: "NotCompleted",
        });
      }

      
      await MilkingRecordPredRepository.bulkCreate(predictions, session);

      await session.commitTransaction();
      session.endSession();

      return {
        cowId,
        lactationCycle: cycle._id,
        totalDays: 280,
        message: "Full lactation prediction generated successfully",
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

export default new MilkingPredictionService();
