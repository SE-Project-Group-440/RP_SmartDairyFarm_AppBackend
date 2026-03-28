import service from "../Services/LactationCycleService.js";
import predictionService from "../Services/MilkingPredictionService.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js";

class LactationCycleController {
  async create(req, res) {
    try {
      const { cowId, calvingDate, healthStatus } = req.body;
      let cycle = await lactationCycleRepository.getLatestByCowId(cowId);

      if (cycle && cycle.LactationStatus === "Active") {
        return res.status(400).json({ error: "Cow already has an active lactation cycle. Please stop it first." });
      }

      const estimatedDryDate = calvingDate ? new Date(calvingDate) : new Date();
      if (calvingDate) {
        estimatedDryDate.setDate(estimatedDryDate.getDate() + 280);
      }

      const newData = {
        cowId,
        calvingDate,
        LactationStatus: "Active",
        lactationRound: cycle ? cycle.lactationRound + 1 : 1,
        lastCalvingDate: cycle?.calvingDate || null,
        healthStatus: healthStatus || "Healthy",
        previousLactationLength: 0,
        calvingInterval: 0,
        concentratedFoodsKg: 0,
        vitaminsG: 0,
        mineralsG: 0,
        estimatedDryDate,
        ...req.body
      };

      const result = await service.create(newData);
      res.status(201).json(result);

      
      // Start prediction generation in background (don't wait for it)
      try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        
        const cowIdToUse = result.cowId || result._id;
        console.log(`[LactationCycleController] Starting async prediction generation for cowId: ${cowIdToUse}`);
        
        predictionService.generateFullLactationPrediction({ 
          cowId: cowIdToUse, 
          token 
        }).catch((e) => {
          console.error(`[LactationCycleController] Prediction generation failed for cow ${cowIdToUse}:`, e.message);
          console.error(e);
        });
      } catch (e) {
        console.error("[LactationCycleController] Failed to start prediction generation:", e.message);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const result = await service.getAll();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getByCow(req, res) {
    try {
      const result = await service.getByCowId(req.params.cowId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getOne(req, res) {
    try {
      const result = await service.getOne(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const result = await service.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      await service.delete(req.params.id);
      res.json({ message: "Lactation cycle deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new LactationCycleController();
