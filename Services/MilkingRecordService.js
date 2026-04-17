import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js"
import cowRepository from "../Repositories/CowRepository.js"
import RecommendationService, { generateMilkRecommendations } from "./RecommendationService.js";
import MilkingPredictionService from "./MilkingPredictionService.js"; // added for generating full-curve predictions
import mongoose from "mongoose";
import MilkRecordPredRepository from "../Repositories/MilkRecordPredRepository.js";
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

  async getTodayMilk(cowId) {
    // Get the latest lactation cycle for this cow
    const cycle = await lactationCycleRepository.getLatestByCowId(cowId);
    
    if (!cycle) {
      return {
        morning: null,
        evening: null,
        message: "No active lactation cycle for this cow"
      };
    }

    // Get today's milk record for this cow and cycle
    const todayRecord = await MilkingRecordRepository.getTodayRecord(cowId, cycle._id);
    
    if (!todayRecord) {
      return {
        morning: null,
        evening: null,
        message: "No milk entry for today"
      };
    }

    return {
      morning: todayRecord.morning || null,
      evening: todayRecord.evening || null,
      dailyMilk: todayRecord.dailyMilk || null,
      lactationCycleId: cycle._id,
      lactationRound: cycle.lactationRound,
      milkingDay: todayRecord.milkingDay || null
    };
  }

  // retrieve all entries recorded on the current date
  getTodayRecords() {
    return MilkingRecordRepository.getTodayEntries();
  }

 async createMilkingRecord(data) {
  const session = await mongoose.startSession();
   
  session.startTransaction();

  try {
    // token optional; may be provided for downstream APIs if required
    const { cowId, morning, evening, notes, calvingDate, token } = data;

    /* -------------------- VALIDATIONS -------------------- */

    const cow = await cowRepository.getById(cowId);
    if (!cow) throw new Error("Cow not found");

    if (morning != null && morning < 0) {
      throw new Error("Morning milk cannot be negative");
    }

    if (evening != null && evening < 0) {
      throw new Error("Evening milk cannot be negative");
    }

    if (calvingDate && isNaN(Date.parse(calvingDate))) {
      throw new Error("Invalid calving date");
    }

    /* -------------------- LACTATION CYCLE -------------------- */

    let cycle = await lactationCycleRepository.getLatestByCowId(cowId);

    if (!cycle || cycle.LactationStatus === "Completed") {
      if (!calvingDate) {
        throw new Error(
          "Calving date is required to start a new lactation cycle"
        );
      }

      const estimatedDryDate = new Date(calvingDate);
      estimatedDryDate.setDate(estimatedDryDate.getDate() + 280);

      cycle = await lactationCycleRepository.create(
        {
          cowId: cow._id,
          lactationRound: cycle ? cycle.lactationRound + 1 : 1,
          calvingDate,
          lastCalvingDate: cycle?.calvingDate || null,
          previousLactationLength: 0,
          calvingInterval: 0,
          concentratedFoodsKg: 0,
          vitaminsG: 0,
          mineralsG: 0,
          healthStatus: "Healthy",
          estimatedDryDate,
          actualDryDate: null,
          LactationStatus: "Active",
        },
        { session }
      );

      // once a new cycle is created we kick off prediction generation for the
      // entire lactation curve; we don’t await it since it can take a while and
      // should not block the transaction.
      MilkingPredictionService
        .generateFullLactationPrediction({ cowId, token })
        .then((res) => console.log("Prediction job started", res))
        .catch((err) => console.error("Prediction generation failed", err.message));
    }

    /* -------------------- TODAY RECORD -------------------- */

    let milkingRecord =
      await MilkingRecordRepository.getTodayRecord(cowId, cycle._id);

    /* -------------------- FIRST ENTRY (MORNING) -------------------- */

    if (!milkingRecord) {
      if (typeof morning !== "number") {
        throw new Error("Morning milk must be recorded first");
      }

      const lastMilk =
        await MilkingRecordRepository.getLastMilkingDay(cycle._id);

      const milkingDay = lastMilk ? lastMilk.milkingDay + 1 : 1;

      const dailyMilk = evening != null ? morning + evening : null;

      milkingRecord = await MilkingRecordRepository.create(
        {
          cowId,
          lactationCycle: cycle._id,
          milkingDay,
          date: new Date(),
          morning,
          evening: evening || null,
          dailyMilk,
          notes,
        },
        { session }
      );
    }

    /* -------------------- SECOND ENTRY (EVENING) -------------------- */

    else {
      if (typeof evening !== "number") {
        throw new Error("Evening milk value required");
      }

      if (milkingRecord.evening != null) {
        throw new Error("Evening milk already recorded for today");
      }

      const dailyMilk = milkingRecord.morning + evening;

      milkingRecord = await MilkingRecordRepository.update(
        milkingRecord._id,
        {
          evening,
          dailyMilk,
          notes,
        },
        { session }
      );
    }

    /* -------------------- PREDICTION -------------------- */

    const hasFullMilkData =
      milkingRecord.morning != null &&
      milkingRecord.evening != null;

    let prediction = null;
    let recommendation = null;
    if (hasFullMilkData) {
      const predictedEntry = await MilkRecordPredRepository.getByCycleAndDay(
        cycle._id,
        milkingRecord.milkingDay
      );

      let initialPrediction = null;
      if (predictedEntry && typeof predictedEntry.dailyMilkPred === "number") {
        initialPrediction = predictedEntry.dailyMilkPred;
      }

      // Try to get today's fresh prediction from FastAPI
      let todayPredictedMilk = initialPrediction; // fallback
      try {
        const milkingDay = milkingRecord.milkingDay;
        const MilkingDay_sq = Math.pow(milkingDay, 2);
        const MilkingDay_cube = Math.pow(milkingDay, 3);
        const log_day = Math.log(milkingDay + 1);
        const lactationLength = cycle.previousLactationLength || 280;

        const features = [
          cycle.calvingInterval || 0,     // Caving Interval
          cycle.lactationRound,           // LactationRound
          cow.ageInMonths || 0,           // Age_in_Months
          cow.breed === "MX" ? 1 : 0,     // Breed_MX
          MilkingDay_sq,                  // MilkingDay_sq
          milkingDay,                     // Milking Day
          MilkingDay_cube,                // MilkingDay_cube
          log_day,                        // log_day
          lactationLength,                // Lactation Length
          cow.breed === "Murrah" ? 1 : 0, // Breed_Murrha
          cow.breed === "NX" ? 1 : 0,     // Breed_NX
        ];

        const todayPredictionResponse = await axios.post(
          `${process.env.FASTAPI_BACKEND}/api/predict`,
          { features }, {
            headers: token ? {
              Authorization: `Bearer ${token}`,
            } : {},
            timeout: 10000,
          }
        );

        todayPredictedMilk = todayPredictionResponse.data.prediction;
      } catch (apiError) {
        console.warn("FastAPI prediction failed, using initial prediction:", apiError.message);
        // Continue with initial prediction as fallback
      }

      // If we have a prediction, generate recommendation
      if (todayPredictedMilk !== null) {
        prediction = {
          initialPrediction,
          todayPredictedMilk,
          value: todayPredictedMilk 
        };

        // Fetch recent milk data to feed into the recommendation engine
        let yesterdayMilk = 0;
        let last3Days = [];
        try {
          const recentRecords = await MilkingRecordRepository.model.find({ 
            cowId, 
            lactationCycle: cycle._id,
            milkingDay: { $lt: milkingRecord.milkingDay }
          }).sort({ milkingDay: -1 }).limit(3).lean();
          
          if (recentRecords && recentRecords.length > 0) {
             // For yesterday's milk, look for milkingDay - 1
             const yday = recentRecords.find(r => r.milkingDay === milkingRecord.milkingDay - 1);
             yesterdayMilk = yday ? yday.dailyMilk : 0;
             // For 3-day trend, we want ascending order (oldest to newest among the 3)
             last3Days = recentRecords.map(r => r.dailyMilk).reverse();
          }
        } catch (err) {
          console.warn("Failed to fetch recent records for recommendations", err);
        }

        recommendation = generateMilkRecommendations({
          actual: milkingRecord.dailyMilk,
          todayPredictedMilk,
          initialPrediction,
          yesterdayMilk,
          last3Days,
          milkingDay: milkingRecord.milkingDay
        });

        await RecommendationService.createRecommendation({
          cowId,
          lactationCycleId: cycle._id,
          milkingRecordId: milkingRecord._id,
          recommendation,
          session,
        });

        // update the corresponding predicted entry with actuals and mark done
        if (predictedEntry) {
          try {
            await MilkRecordPredRepository.updateByCycleAndDay(
              cycle._id,
              milkingRecord.milkingDay,
              {
                todayPredictedMilk,
                dailyMilkPredDone: 1,
                actualDailyMilk: milkingRecord.dailyMilk,
                LactationPredStatus: "Completed",
              },
              session
            );
          } catch (e) {
            console.error("Failed to update prediction record:", e.message);
          }
        }
      }
    }

    /* -------------------- COMMIT -------------------- */

    await session.commitTransaction();
    session.endSession();

    return {
      milkingRecord,
      lactationCycle: cycle,
      prediction,
      recommendation,
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}




}

export default new MilkingRecordService();
