import express from "express";
import cowController from "../Controllers/CowController.js";

const CowRouter = express.Router();

CowRouter.post("/", cowController.create);
CowRouter.get("/", cowController.getAll);
CowRouter.get("/:id", cowController.getOne);
CowRouter.put("/:id", cowController.update);
CowRouter.delete("/:id", cowController.delete);
CowRouter.get("/lact/milk/:id",cowController.getcowlactmilk);

export default CowRouter;
