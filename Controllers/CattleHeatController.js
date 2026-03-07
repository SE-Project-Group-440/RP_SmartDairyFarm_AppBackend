import { getHeatPrediction } from "../Services/HeatStressService.js";

export const getCattleHeatData = async (req, res) => {
  try {
    const collarIds = ["Cattle1", "Cattle2"];

    const result = await Promise.all(
      collarIds.map(async (collarId) => {
        const prediction = await getHeatPrediction(collarId);

        if (!prediction) {
          return {
            cattleId: collarId,
            bodyTemp: null,
            envTemp: null,
            humidity: null,
            stressLevel: "Normal",
            thi: null,
          };
        }

        // Directly map ML response
        return {
          cattleId: prediction.cattle_id,
          bodyTemp: prediction.body_temp,
          envTemp: prediction.env_temp,
          humidity: prediction.humidity,
          stressLevel: prediction.stress_level,
          thi: prediction.thi_index_1hr_ahead,
        };
      })
    );

    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching ML data:", err);
    res.status(500).json({ error: "Failed to fetch cattle heat data" });
  }
};