import CattleDiseaseService from "../Services/CattleDiseaseService.js";

class CattleDiseaseController {
  static async predictDisease(req, res) {
    try {
      const result = await CattleDiseaseService.predict(req);
      return res.status(200).json({
        success: true,
        data: result,
        message: "Disease prediction completed successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Disease prediction failed"
      });
    }
  }

  static async getCareInstructions(req, res) {
    try {
      const { diseaseType } = req.params;
      
      if (!diseaseType) {
        return res.status(400).json({
          success: false,
          message: "Disease type is required"
        });
      }

      const result = await CattleDiseaseService.getCareInstructionsByDisease(diseaseType);
      return res.status(200).json({
        success: true,
        data: result,
        message: "Care instructions retrieved successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to retrieve care instructions"
      });
    }
  }
}

export default CattleDiseaseController;
