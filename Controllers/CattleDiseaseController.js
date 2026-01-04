import CattleDiseaseService from "../services/CattleDiseaseService.js";

class CattleDiseaseController {
  static async predictDisease(req, res) {
    try {
      const result = await CattleDiseaseService.predict(req);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({
        message: error.message || "Disease prediction failed"
      });
    }
  }
}

export default CattleDiseaseController;
