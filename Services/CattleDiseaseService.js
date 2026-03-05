import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const AI_BASE_URL = "http://127.0.0.1:5000/api/api/cattle/predict";

class CattleDiseaseService {
  // Generate care tips based on disease prediction
  static getCareInstructions(diseaseType) {
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
      }
    };

    return careInstructions[diseaseType] || null;
  }

  static async predict(req) {
    try {
      const formData = new FormData();

      // Image file
      if (req.files?.image?.[0]) {
        formData.append(
          "image",
          fs.createReadStream(req.files.image[0].path)
        );
      }

      // Report file
      if (req.files?.report?.[0]) {
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
      
      // Add care tips based on the prediction
      if (predictionResult && predictionResult.prediction) {
        const diseaseType = predictionResult.prediction.toUpperCase();
        const careInstructions = this.getCareInstructions(diseaseType);
        
        if (careInstructions) {
          predictionResult.careInstructions = careInstructions;
          predictionResult.hasCareInstructions = true;
        }
      }

      return predictionResult;

    } catch (error) {
      throw {
        status: error.response?.status || 500,
        message:
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message
      };
    }
  }

  // Get care instructions for a specific disease (useful for testing or direct queries)
  static async getCareInstructionsByDisease(diseaseType) {
    const normalizedDisease = diseaseType.toUpperCase();
    const careInstructions = this.getCareInstructions(normalizedDisease);
    
    if (!careInstructions) {
      throw {
        status: 400,
        message: `Care instructions not available for disease type: ${diseaseType}. Available types: FMD, LSD`
      };
    }
    
    return {
      diseaseType: normalizedDisease,
      careInstructions: careInstructions,
      hasCareInstructions: true
    };
  }
}

export default CattleDiseaseService;
