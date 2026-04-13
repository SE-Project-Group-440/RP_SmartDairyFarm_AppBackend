import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js"
import cowRepository from "../Repositories/CowRepository.js"
import RecommendationService from "./RecommendationService.js";
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

      milkingRecord = await MilkingRecordRepository.create(
        {
          cowId,
          lactationCycle: cycle._id,
          milkingDay,
          date: new Date(),
          morning,
          evening: null,
          dailyMilk: null,
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

      if (
        predictedEntry &&
        typeof predictedEntry.dailyMilkPred === "number"
      ) {
        const allCyclePredictions =
          await MilkRecordPredRepository.getByCycle(cycle._id);

        // Extract initial prediction from curve
        const initialPrediction = predictedEntry.dailyMilkPred;

        // Try to get today's fresh prediction from FastAPI
        let todayPredictedMilk = initialPrediction; // fallback to initial prediction
        try {
          const features = [
            milkingRecord.milkingDay,
            cycle.lactationRound,
            milkingRecord.milkingDay - 1,
            cycle.calvingInterval || 0,
            cycle.concentratedFoodsKg || 0,
            cycle.vitaminsG || 0,
            cycle.mineralsG || 0,
            cow.ageInMonths || 0,
            cow.breed === "MX" ? 1 : 0,
            cow.breed === "Murrah" ? 1 : 0,
            cow.breed === "NX" ? 1 : 0,
            cycle.healthStatus === "Healthy" ? 1 : 0,
            cycle.healthStatus === "Unhealthy" ? 1 : 0,
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

        
        prediction = {
          initialPrediction,
          todayPredictedMilk,
          value: todayPredictedMilk 
        };

        recommendation = generateMilkRecommendations({
          actual: milkingRecord.dailyMilk,
          initialPrediction: initialPrediction,
          todayPredictedMilk: todayPredictedMilk,
          milkingDay: milkingRecord.milkingDay,
          cyclePredictions: allCyclePredictions,
        });

        await RecommendationService.createIfCritical({
          cowId,
          lactationCycleId: cycle._id,
          milkingRecordId: milkingRecord._id,
          recommendation,
          session,
        });

        // update the corresponding predicted entry with actuals and mark done
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

function generateMilkRecommendations({
  actual,
  initialPrediction,
  todayPredictedMilk,
  milkingDay,
  cyclePredictions = [],
}) {
  // Calculate differences against today prediction
  const diff = actual - todayPredictedMilk;
  const diffPercent = todayPredictedMilk > 0 ? (diff / todayPredictedMilk) * 100 : 0;

  // Also calculate difference against initial prediction for context
  const diffFromInitial = actual - initialPrediction;
  const diffFromInitialPercent = initialPrediction > 0 ? (diffFromInitial / initialPrediction) * 100 : 0;

  const { isPeakTime, peakDay } = detectPeakWindow(
    cyclePredictions,
    milkingDay
  );

 
  let status = "normal";
  let color = "blue";

 
  let actionKeys = [];

  
  if (diffPercent > 20) {
    status = "above_expected";
    color = "green";
    actionKeys = [
      "recommendation_above_expected_action_1",
      "recommendation_above_expected_action_2",
      "recommendation_above_expected_action_3",
    ];
  } else if (diffPercent >= -10 && diffPercent <= 20) {
    status = "on_track";
    color = "blue";
    actionKeys = [
      "recommendation_on_track_action_1",
      "recommendation_on_track_action_2",
    ];
  } else {
    status = "below_expected";
    color = "orange";
    actionKeys = isPeakTime
      ? [
          "recommendation_below_expected_peak_action_1",
          "recommendation_below_expected_peak_action_2",
          "recommendation_below_expected_peak_action_3",
        ]
      : [
          "recommendation_below_expected_non_peak_action_1",
          "recommendation_below_expected_non_peak_action_2",
          "recommendation_below_expected_non_peak_action_3",
        ];
  }

  return {
    actualMilk: Number(actual.toFixed(1)),
    initialPredictedMilk: Number(initialPrediction.toFixed(1)),
    predictedMilk: Number(todayPredictedMilk.toFixed(1)),
    deviation: Number(diff.toFixed(2)),
    deviationPercent: Number(diffPercent.toFixed(1)),
    deviationFromInitial: Number(diffFromInitial.toFixed(2)),
    deviationFromInitialPercent: Number(diffFromInitialPercent.toFixed(1)),
    status,              
    color,
    key: status,         
    actions: actionKeys, 
    peakDay,
  };
}

function detectPeakWindow(cyclePredictions = [], milkingDay = 0) {
  
  const isPeakTime = milkingDay >= 45 && milkingDay <= 70;
  return { isPeakTime, peakDay: null }; 
}
