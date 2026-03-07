import CattleDiseaseService from "../Services/CattleDiseaseService.js";
import jwt from "jsonwebtoken";

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

  // Get prediction history for the current user
  static async getPredictionHistory(req, res) {
    try {
      // Extract user ID from JWT token
      let userId = null;
      if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.decode(token);
        userId = decoded?._id || decoded?.id;
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const result = await CattleDiseaseService.getUserPredictionHistory(userId, limit);
      
      return res.status(200).json({
        success: true,
        data: result,
        message: "Prediction history retrieved successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to retrieve prediction history"
      });
    }
  }

  // Get prediction history for a specific cow
  static async getCowPredictionHistory(req, res) {
    try {
      const { cowId } = req.params;
      
      if (!cowId) {
        return res.status(400).json({
          success: false,
          message: "Cow ID is required"
        });
      }

      const result = await CattleDiseaseService.getCowPredictionHistory(cowId);
      return res.status(200).json({
        success: true,
        data: result,
        message: "Cow prediction history retrieved successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to retrieve cow prediction history"
      });
    }
  }

  // Get prediction statistics
  static async getPredictionStatistics(req, res) {
    try {
      // Extract user ID from JWT token for user-specific stats
      let userId = null;
      if (req.query.userOnly === 'true' && req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.decode(token);
        userId = decoded?._id || decoded?.id;
      }

      const result = await CattleDiseaseService.getPredictionStatistics(userId);
      return res.status(200).json({
        success: true,
        data: result,
        message: "Prediction statistics retrieved successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to retrieve prediction statistics"
      });
    }
  }

  // Get recent predictions (admin functionality)
  static async getRecentPredictions(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const result = await CattleDiseaseService.getRecentPredictions(days);
      
      return res.status(200).json({
        success: true,
        data: result,
        message: "Recent predictions retrieved successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to retrieve recent predictions"
      });
    }
  }

  // Get predictions by severity
  static async getPredictionsBySeverity(req, res) {
    try {
      const { severity } = req.params;
      
      if (!severity) {
        return res.status(400).json({
          success: false,
          message: "Severity is required"
        });
      }

      const result = await CattleDiseaseService.getPredictionsBySeverity(severity);
      return res.status(200).json({
        success: true,
        data: result,
        message: "Predictions by severity retrieved successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to retrieve predictions by severity"
      });
    }
  }

  // Get severity statistics
  static async getSeverityStatistics(req, res) {
    try {
      // Extract user ID from JWT token for user-specific stats
      let userId = null;
      if (req.query.userOnly === 'true' && req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.decode(token);
        userId = decoded?._id || decoded?.id;
      }

      const result = await CattleDiseaseService.getSeverityStatistics(userId);
      return res.status(200).json({
        success: true,
        data: result,
        message: "Severity statistics retrieved successfully"
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to retrieve severity statistics"
      });
    }
  }
}

export default CattleDiseaseController;
