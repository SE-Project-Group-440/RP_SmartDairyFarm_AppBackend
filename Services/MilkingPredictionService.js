import mongoose from "mongoose";
import axios from "axios";
import "dotenv/config"
import cowRepository from "../Repositories/CowRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js";
import MilkingRecordPredRepository from "../Repositories/MilkRecordPredRepository.js";

class MilkingPredictionService {
  async generateFullLactationPrediction({ cowId, token }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log(`[Prediction] Starting prediction generation for cow: ${cowId}`);
      
      const cow = await cowRepository.getById(cowId);
      if (!cow) throw new Error("Cow not found");
      console.log(`[Prediction] Cow found: ${cow.name}`);

      const cycle = await lactationCycleRepository.getLatestByCowId(cowId);
      if (!cycle) {
        console.error(`[Prediction] ERROR: No lactation cycle found for cow ${cowId}`);
        throw new Error("No lactation cycle found for this cow. Please create a lactation cycle first.");
      }
      console.log(`[Prediction] Lactation cycle found: ${cycle._id}`);

      const predictions = [];
      const startDate = new Date(cycle.startDate || Date.now());

      // Predict for 280 days
      for (let day = 1; day <= 280; day++) {
        const lactationLength = cycle.previousLactationLength || 280; // Standardize Lactation Length over the cycle

        const Breed_MX = cow.breed === "MX" ? 1 : 0;
        const Breed_Murrha = cow.breed === "Murrah" ? 1 : 0;
        const Breed_NX = cow.breed === "NX" ? 1 : 0;

        const MilkingDay_sq = Math.pow(day, 2);
        const MilkingDay_cube = Math.pow(day, 3);
        const log_day = Math.log(day + 1);

        const features = [
          cycle.calvingInterval || 0, // Caving Interval
          cycle.lactationRound,       // LactationRound
          cow.ageInMonths || 0,       // Age_in_Months
          Breed_MX,                   // Breed_MX
          day,                        // Milking Day
          lactationLength,            // Lactation Length
          Breed_Murrha,               // Breed_Murrha
          Breed_NX,                   // Breed_NX
        ];

        
        try {
          if (!token) {
            console.warn(`[Prediction] WARNING: No token provided for day ${day}. Using request without auth.`);
          }
          
          const response = await axios.post(
            `${process.env.FASTAPI_BACKEND}/api/predict`,
            { features },
            {
              headers: token ? {
                Authorization: `Bearer ${token}`,
              } : {},
              timeout: 10000,
            }
          );

          const predictedMilk = response.data?.prediction;
          if (predictedMilk === undefined || predictedMilk === null) {
            throw new Error(`Invalid response format from Flask API: ${JSON.stringify(response.data)}`);
          }

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
        } catch (apiError) {
          console.error(`[Prediction] ERROR calling Flask API for day ${day}:`, apiError.message);
          throw new Error(`Flask API error on day ${day}: ${apiError.message}`);
        }
      }

      
      console.log(`[Prediction] Generated ${predictions.length} prediction records. Saving to database...`);
      
      const bulkResult = await MilkingRecordPredRepository.bulkCreate(predictions, session);
      console.log(`[Prediction] Successfully saved predictions to database`);

      await session.commitTransaction();
      session.endSession();

      console.log(`[Prediction] COMPLETE: Full lactation prediction generated for cow ${cowId}`);
      
      return {
        cowId,
        lactationCycle: cycle._id,
        totalDays: 280,
        message: "Full lactation prediction generated successfully",
      };
    } catch (err) {
      console.error(`[Prediction] FAILED:`, err.message);
      console.error(`[Prediction] Stack:`, err.stack);
      
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

export default new MilkingPredictionService();
