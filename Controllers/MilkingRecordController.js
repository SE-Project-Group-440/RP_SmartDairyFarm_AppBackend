import service from "../Services/MilkingRecordService.js";

class MilkingRecordController {
  async create(req, res) {
    try {
      const result = await service.create(req.body);
      res.status(201).json(result);
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

  async getByCycle(req, res) {
    try {
      const result = await service.getByCycleId(req.params.cycleId);
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
      res.json({ message: "Milking record deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async createmilktoml(req, res) {
    try {
      console.log("REQ BODY = ", req.body);
      const result = await service.createMilkingRecord({
        ...req.body,
        token: req.token
      });


      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

}

export default new MilkingRecordController();
