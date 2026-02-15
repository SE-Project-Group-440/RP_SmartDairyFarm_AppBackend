import express from "express";
import cowController from "../Controllers/CowController.js";

const CowRouter = express.Router();

CowRouter.post("/", cowController.create);
CowRouter.get("/", cowController.getAll);
CowRouter.put("/:id", cowController.update);
CowRouter.delete("/:id", cowController.delete);
CowRouter.get("/cowsummary", cowController.getCowsWithLactationSummary);
CowRouter.get("/lact/milk/:id", cowController.getcowlactmilk);
CowRouter.get("/:id", cowController.getOne);


export default CowRouter;
