import express from "express";
import Sprinkler from "../Models/SprinklerModel.js";
import { firebaseDB } from "../Configurations/Firebase.js";

const router = express.Router();

router.post("/manual", async (req, res) => {

  const { cattleId, state } = req.body;

  const sprinkler = await Sprinkler.findOneAndUpdate(
    { cattleId },
    { mode: "MANUAL", state },
    { new: true, upsert: true }
  );

  await firebaseDB.ref(`/sprinklers/${cattleId}`).update({
    state: sprinkler.state,
    mode: "MANUAL",
    lastUpdated: new Date().toISOString()
  });

  res.json(sprinkler);
});

router.post("/auto", async (req, res) => {

  const { cattleId } = req.body;

  const sprinkler = await Sprinkler.findOneAndUpdate(
    { cattleId },
    { mode: "AUTO" },
    { new: true, upsert: true }
  );

  await firebaseDB.ref(`/sprinklers/${cattleId}`).update({
    mode: "AUTO",
    lastUpdated: new Date().toISOString()
  });

  res.json(sprinkler);
});

router.get("/status/:cattleId", async (req, res) => {
  const { cattleId } = req.params;

  const sprinkler = await Sprinkler.findOne({ cattleId });

  if (!sprinkler) {
    return res.json({ mode: "AUTO", state: false });
  }

  res.json({
    mode: sprinkler.mode,
    state: sprinkler.state
  });
});
export default router;