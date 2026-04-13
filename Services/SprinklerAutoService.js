import cron from "node-cron";
import Sprinkler from "../Models/SprinklerModel.js";
import { getHeatPrediction } from "./HeatStressService.js";
import { firebaseDB } from "../Configurations/Firebase.js";

const HIGH_ON = 78;
const HIGH_OFF = 76;

const collarIds = ["Cattle1", "Cattle2"];

export const startSprinklerAutoService = () => {

  cron.schedule("*/3 * * * * *", async () => {

    console.log("Running sprinkler auto check...");

    for (const collarId of collarIds) {

      const prediction = await getHeatPrediction(collarId);
        if (!prediction) {
    console.log(`No prediction for ${collarId}`);
    continue;
      }

      const thi = prediction.thi_index_1hr_ahead;
      console.log(`THI for ${collarId}:`, thi);

      let sprinkler = await Sprinkler.findOne({ cattleId: collarId });

      if (!sprinkler) {
        sprinkler = await Sprinkler.create({ cattleId: collarId });
      }

      if (sprinkler.mode === "AUTO") {

        if (thi >= HIGH_ON) sprinkler.state = true;
        if (thi <= HIGH_OFF) sprinkler.state = false;

        await sprinkler.save();

        // Update Firebase
        await firebaseDB.ref(`/sprinklers/${collarId}`).set({
          state: sprinkler.state,
          mode: sprinkler.mode,
          thi: thi,
          lastUpdated: new Date().toISOString()
        });
        console.log(`Sprinkler state for ${collarId}:`, sprinkler.state);

        console.log(`Updated Firebase for ${collarId}`);
      }
    }

  });

};