import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import DiseasePredictionRepository from "../Repositories/DiseasePredictionRepository.js";
import jwt from "jsonwebtoken";

const AI_BASE_URL = `${process.env.FASTAPI_BACKEND}/api/cattle/disease/predict`;

class CattleDiseaseService {
  // Generate care tips based on disease prediction
  static getCareInstructions(diseaseType) {
    console.log("getCareInstructions called with:", diseaseType);
    
    const careInstructions = {
      FMD: {
        diseaseInfo: {
          fullName: "Foot and Mouth Disease",
          emoji: "🦠",
          description: "FMD is viral — there is no direct cure, but supportive care reduces severity."
        },
        immediateActions: {
          title: "🚨 Immediate Actions",
          priority: "high",
          color: "red",
          actions: [
            "Isolate the infected animal immediately",
            "Stop animal movement in and out of the farm", 
            "Disinfect feeding and watering areas",
            "Inform a veterinary officer urgently"
          ]
        },
        care: {
          title: "🩺 Care & Supportive Treatment",
          treatments: [
            "Provide soft, easy-to-eat feed (due to mouth sores)",
            "Give plenty of clean water",
            "Apply antiseptic mouth wash (as prescribed by vet)",
            "Clean foot lesions with mild disinfectant",
            "Use anti-inflammatory medication (only under vet guidance)"
          ]
        },
        monitoring: {
          title: "🌡 Monitor Daily",
          symptoms: [
            "Body temperature",
            "Drooling or mouth ulcers", 
            "Lameness or hoof damage",
            "Reduced milk production"
          ]
        },
        prevention: {
          title: "🧼 Prevention for Other Cattle",
          measures: [
            "Vaccinate healthy cattle",
            "Disinfect equipment daily",
            "Limit visitor access", 
            "Use footbaths at entry points"
          ]
        }
      },
      LSD: {
        diseaseInfo: {
          fullName: "Lumpy Skin Disease",
          emoji: "🦠", 
          description: "LSD is also viral — supportive care is key."
        },
        immediateActions: {
          title: "🚨 Immediate Actions",
          priority: "high",
          color: "red",
          actions: [
            "Isolate infected cattle immediately",
            "Control mosquitoes and biting insects",
            "Inform veterinary authorities",
            "Avoid sharing equipment between animals"
          ]
        },
        care: {
          title: "🩺 Care & Supportive Treatment", 
          treatments: [
            "Clean skin nodules with antiseptic",
            "Apply topical antibiotic cream to prevent secondary infection",
            "Provide anti-inflammatory medication (vet prescribed)",
            "Maintain high-quality nutrition",
            "Ensure hydration"
          ]
        },
        vectorControl: {
          title: "🦟 Vector Control (Very Important for LSD)",
          measures: [
            "Spray insect repellents",
            "Remove stagnant water",
            "Keep cattle housing clean and dry"
          ]
        },
        monitoring: {
          title: "📊 Monitor For:",
          symptoms: [ 
            "Fever",
            "Skin nodules spreading",
            "Swollen lymph nodes", 
            "Decreased milk yield",
            "Signs of secondary bacterial infection"
          ]
        }
      },
      UNHEALTHY: {
        diseaseInfo: {
          fullName: "Abnormal Blood Parameters",
          emoji: "🩸",
          description: "Blood tests show abnormal values indicating potential health issues requiring veterinary attention."
        },
        immediateActions: {
          title: "🚨 Immediate Actions",
          priority: "medium",
          color: "orange",
          actions: [
            "Contact a veterinarian for detailed examination",
            "Monitor the animal closely for symptoms",
            "Isolate if showing signs of illness",
            "Review feeding and water quality"
          ]
        },
        care: {
          title: "🩺 General Care & Monitoring",
          treatments: [
            "Ensure adequate nutrition and hydration",
            "Provide comfortable, clean environment",
            "Follow veterinary recommendations",
            "Monitor temperature and appetite",
            "Keep detailed health records"
          ]
        },
        monitoring: {
          title: "📊 Continue Monitoring",
          symptoms: [
            "Changes in appetite or behavior",
            "Body temperature variations",
            "Milk production changes",
            "Physical signs of illness"
          ]
        },
        prevention: {
          title: "🛡️ Preventive Measures",
          measures: [
            "Regular health checkups",
            "Maintain clean water sources",
            "Ensure balanced nutrition",
            "Follow vaccination schedules"
          ]
        }
      }
    };

    const result = careInstructions[diseaseType] || null;
    console.log("getCareInstructions returning:", !!result, "for disease:", diseaseType);
    console.log("Available keys in careInstructions:", Object.keys(careInstructions));
    return result;
  }

  static async predict(req) {
    let uploadedFiles = []; // Track uploaded files for cleanup
    
    try {
      const formData = new FormData();

      // Image file
      if (req.files?.image?.[0]) {
        uploadedFiles.push(req.files.image[0].path);
        formData.append(
          "image",
          fs.createReadStream(req.files.image[0].path)
        );
      }

      // Report file
      if (req.files?.report?.[0]) {
        uploadedFiles.push(req.files.report[0].path);
        formData.append(
          "report",
          fs.createReadStream(req.files.report[0].path)
        );
      }

      // Symptoms
      if (req.body?.symptoms) {
        formData.append("symptoms", req.body.symptoms);
      }

      const response = await axios.post(AI_BASE_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: req.headers.authorization // forward JWT
        }
      });

      // Extract the prediction result
      const predictionResult = response.data;
      
      // Get the actual prediction from the AI response
      const actualPrediction = predictionResult.final_decision || 
                              predictionResult.image_prediction || 
                              predictionResult.prediction;
      
      // Add care tips based on the prediction
      if (actualPrediction) {
        const diseaseType = actualPrediction.toUpperCase();
        const careInstructions = this.getCareInstructions(diseaseType);
        
        if (careInstructions) {
          predictionResult.careInstructions = careInstructions;
          predictionResult.hasCareInstructions = true;
        }
      }

      // Save prediction to database
      try {
        await this.savePredictionToDatabase(req, predictionResult);
      } catch (dbError) {
        // Log the database error but don't fail the prediction response
        console.error("Failed to save prediction to database:", dbError);
      }

      // Clean up uploaded files after successful processing
      await this.cleanupUploadedFiles(uploadedFiles);

      return predictionResult;

    } catch (error) {
      // Clean up uploaded files even if there's an error
      await this.cleanupUploadedFiles(uploadedFiles);
      
      throw {
        status: error.response?.status || 500,
        message:
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message
      };
    }
  }

  // Helper method to clean up uploaded files
  static async cleanupUploadedFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up uploaded file: ${filePath}`);
      } catch (error) {
        console.error(`Failed to delete file ${filePath}:`, error.message);
      }
    }
  }

  // Helper method to save prediction to database
  static async savePredictionToDatabase(req, predictionResult) {
    try {
      // Extract user ID from JWT token if available
      let userId = null;
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace('Bearer ', '');
          const decoded = jwt.decode(token);
          userId = decoded?._id || decoded?.id;
        } catch (jwtError) {
          console.log("Could not decode JWT token:", jwtError.message);
        }
      }

      // Extract the actual prediction from AI response
      let actualPrediction = predictionResult.final_decision || 
                            predictionResult.image_prediction || 
                            predictionResult.prediction || 
                            'Unknown';

      // If final decision is "Uncertain" but we have blood analysis, use that instead
      if (actualPrediction === "Uncertain" && predictionResult.blood_analysis?.status) {
        actualPrediction = predictionResult.blood_analysis.status;
      }

      // Normalize prediction case (capitalize first letter)
      if (actualPrediction && actualPrediction !== 'Unknown') {
        actualPrediction = actualPrediction.charAt(0).toUpperCase() + actualPrediction.slice(1).toLowerCase();
      }

      // Extract confidence from available fields
      const confidence = predictionResult.overall_confidence || 
                        predictionResult.image_confidence || 
                        predictionResult.confidence || 
                        null;

      // Extract severity from AI response
      let severity = predictionResult.severity || 
                    predictionResult.disease_severity || 
                    predictionResult.severity_level || 
                    predictionResult.severity_assessment?.level ||
                    predictionResult.severity_assessment ||
                    null;

      // Handle "none" severity as null
      if (severity === "none" || severity === "None") {
        severity = null;
      }

      // Normalize severity to proper case (capitalize first letter)
      if (severity) {
        severity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
      }

      // Prepare prediction data for database
      const predictionData = {
        userId: userId,
        cowId: req.body?.cowId || null,
        prediction: actualPrediction,
        severity: severity,
        confidence: confidence,
        inputData: {
          symptoms: req.body?.symptoms || null,
          hasImage: !!(req.files?.image?.[0]),
          hasReport: !!(req.files?.report?.[0]),
          imageFileName: req.files?.image?.[0]?.filename || null,
          reportFileName: req.files?.report?.[0]?.filename || null
        },
        aiResponse: predictionResult,
        careInstructionsProvided: !!predictionResult.hasCareInstructions,
        status: 'Active'
      };

      // Save to database
      const savedPrediction = await DiseasePredictionRepository.create(predictionData);
      console.log("Disease prediction saved with ID:", savedPrediction._id);

      return savedPrediction;
    } catch (error) {
      console.error("Error saving prediction to database:", error);
      throw error;
    }
  }

  // Get care instructions for a specific disease (useful for testing or direct queries)
  static async getCareInstructionsByDisease(diseaseType) {
    console.log("getCareInstructionsByDisease called with:", diseaseType);
    
    const normalizedDisease = diseaseType.toUpperCase();
    console.log("Normalized disease type:", normalizedDisease);
    
    const careInstructions = this.getCareInstructions(normalizedDisease);
    console.log("Care instructions found:", !!careInstructions);
    
    if (!careInstructions) {
      console.log("No care instructions found for:", normalizedDisease);
      throw {
        status: 400,
        message: `Care instructions not available for disease type: ${diseaseType}. Available types: FMD, LSD, UNHEALTHY`
      };
    }
    
    return {
      diseaseType: normalizedDisease,
      careInstructions: careInstructions,
      hasCareInstructions: true
    };
  }

  // Get prediction history for a user
  static async getUserPredictionHistory(userId, limit = 10) {
    try {
      return await DiseasePredictionRepository.getByUserId(userId, limit);
    } catch (error) {
      throw {
        status: 500,
        message: "Failed to retrieve prediction history"
      };
    }
  }

  // Get prediction history for a specific cow
  static async getCowPredictionHistory(cowId) {
    try {
      return await DiseasePredictionRepository.getByCowId(cowId);
    } catch (error) {
      throw {
        status: 500,
        message: "Failed to retrieve cow prediction history"
      };
    }
  }

  // Get prediction statistics
  static async getPredictionStatistics(userId = null) {
    try {
      return await DiseasePredictionRepository.getPredictionStats(userId);
    } catch (error) {
      throw {
        status: 500,
        message: "Failed to retrieve prediction statistics"
      };
    }
  }

  // Get recent predictions across the system
  static async getRecentPredictions(days = 7) {
    try {
      return await DiseasePredictionRepository.getRecentPredictions(days);
    } catch (error) {
      throw {
        status: 500,
        message: "Failed to retrieve recent predictions"
      };
    }
  }

  // Get predictions by severity
  static async getPredictionsBySeverity(severity) {
    try {
      return await DiseasePredictionRepository.getBySeverity(severity);
    } catch (error) {
      throw {
        status: 500,
        message: "Failed to retrieve predictions by severity"
      };
    }
  }

  // Get severity statistics
  static async getSeverityStatistics(userId = null) {
    try {
      return await DiseasePredictionRepository.getSeverityStats(userId);
    } catch (error) {
      throw {
        status: 500,
        message: "Failed to retrieve severity statistics"
      };
    }
  }
}

export default CattleDiseaseService;
