import express from "express";
import controller from "../Controllers/LactationCycleController.js";

const LactationCycleRoute = express.Router();

LactationCycleRoute.post("/", controller.create);
LactationCycleRoute.get("/", controller.getAll);
LactationCycleRoute.get("/cow/:cowId", controller.getByCow);
LactationCycleRoute.get("/:id", controller.getOne);
LactationCycleRoute.put("/:id", controller.update);
LactationCycleRoute.delete("/:id", controller.delete);

export default LactationCycleRoute;
