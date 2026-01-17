import express from "express";
import controller from "../Controllers/MilkingRecordController.js";
import requireAuth from "../Middleware/UserAuth.js";


const MilkingRecordRoute = express.Router();

MilkingRecordRoute.post("/", controller.create);
MilkingRecordRoute.post("/milktoml",requireAuth, controller.createmilktoml);
MilkingRecordRoute.get("/", controller.getAll);
MilkingRecordRoute.get("/cow/:cowId", controller.getByCow);
MilkingRecordRoute.get("/cycle/:cycleId", controller.getByCycle);
MilkingRecordRoute.get("/:id", controller.getOne);
MilkingRecordRoute.put("/:id", controller.update);
MilkingRecordRoute.delete("/:id", controller.delete);

export default MilkingRecordRoute;
