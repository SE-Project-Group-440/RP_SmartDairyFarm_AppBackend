import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const AI_BASE_URL = "http://127.0.0.1:5000/api/api/cattle/predict";

class CattleDiseaseService {
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

      return response.data;

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
}

export default CattleDiseaseService;
