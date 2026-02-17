import service from "../Services/LactationCycleService.js";
import predictionService from "../Services/MilkingPredictionService.js";

class LactationCycleController {
  async create(req, res) {
    try {
      const result = await service.create(req.body);
      res.status(201).json(result);

      
      try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        predictionService.generateFullLactationPrediction({ cowId: result.cowId || result.cowId, token }).catch((e) =>
          console.error("Prediction generation failed:", e.message)
        );
      } catch (e) {
        console.error("Failed to start prediction generation:", e.message);
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
