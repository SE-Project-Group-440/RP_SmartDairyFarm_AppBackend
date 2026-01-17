import cowService from "../Services/CowService.js";

class CowController {
  
  async create(req, res) {
    try {
      const cow = await cowService.createCow(req.body);
      res.status(201).json(cow);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const cows = await cowService.getAllCows();
      res.json(cows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getOne(req, res) {
    try {
      const cow = await cowService.getCow(req.params.id);
      if (!cow) return res.status(404).json({ message: "Cow not found" });
      res.json(cow);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const updated = await cowService.updateCow(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Cow not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const deleted = await cowService.deleteCow(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Cow not found" });
      res.json({ message: "Cow deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getcowlactmilk(req, res) {
    try {
      const cow = await cowService.getCowLactationHistory(req.params.id);
      if (!cow) return res.status(404).json({ message: "Cow not found" });
      res.json(cow);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new CowController();
