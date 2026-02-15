import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js"
import cowRepository from "../Repositories/CowRepository.js"
import RecommendationService from "./RecommendationService.js";
import mongoose from "mongoose";
import axios from "axios";
import MilkRecordPredRepository from "../Repositories/MilkRecordPredRepository.js";

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
    const { cowId, morning, evening, notes, token, calvingDate } = data;

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
    let features = null;

    if (hasFullMilkData) {
      const lastCompletedCycle =
        await lactationCycleRepository.getLastCompletedByCowId(cowId);

      let lactationLength = 0;

      if (lastCompletedCycle) {
        const lastMilkOfPreviousCycle =
          await MilkingRecordRepository.getLastMilkingDayByCycleId(
            lastCompletedCycle._id
          );

        lactationLength =
          lastMilkOfPreviousCycle?.milkingDay || 0;
      }

      features = [
        milkingRecord.milkingDay,
        cycle.lactationRound,
        lactationLength,
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

      const mlRes = await axios.post(
        "http://localhost:5000/api/predict",
        { features },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const predictedMilk = mlRes.data.prediction;

      prediction = { value: predictedMilk };
      recommendation = generateMilkRecommendations(
        milkingRecord.dailyMilk,
        predictedMilk
      );

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
            dailyMilkPred: predictedMilk,
            dailyMilkPredDone: 1,
            actualDailyMilk: milkingRecord.dailyMilk,
          },
          session
        );
      } catch (e) {
        console.error("Failed to update prediction record:", e.message);
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
      features,
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}




}

export default new MilkingRecordService();

function generateMilkRecommendations(actual, predicted) {
  const diff = actual - predicted;
  const diffPercent = predicted > 0 ? (diff / predicted) * 100 : 0;

  let status = "normal";
  let color = "blue";
  let title = "";
  let message = "";
  let actions = [];

  if (diffPercent > 20) {
    status = "above_expected";
    color = "green";
    title = "Excellent Performance ";
    message = "Milk yield is significantly higher than the predicted value.";
    actions = [
      "Maintain the current feeding schedule",
      "Continue regular health monitoring",
      "This cow is performing better than expected",
    ];
  }
  else if (diffPercent >= -10 && diffPercent <= 20) {
    status = "on_track";
    color = "blue";
    title = "On Track ";
    message = "Milk yield is within the expected prediction range.";
    actions = [
      "No immediate action required",
      "Continue the current management routine",
    ];
  }
  else {
    status = "below_expected";
    color = "orange";
    title = "Needs Attention ";
    message = "Milk yield is lower than predicted.";
    actions = [
      "Review feed quality and quantity",
      "Ensure sufficient clean water intake",
      "Observe cow behavior for stress or discomfort",
    ];
  }

  return {
    actualMilk: Number(actual.toFixed(1)),
    predictedMilk: Number(predicted.toFixed(1)),
    deviation: Number(diff.toFixed(2)),
    deviationPercent: Number(diffPercent.toFixed(1)),
    status,
    color,
    title,
    message,
    actions,
  };
}
