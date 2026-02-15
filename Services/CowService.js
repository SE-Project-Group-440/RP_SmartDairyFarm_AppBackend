import cowRepository from "../Repositories/CowRepository.js";
import lactationCycleRepository from "../Repositories/LactationCycleRepository.js";
import MilkingRecordRepository from "../Repositories/MilkingRecordRepository.js";
import mongoose from "mongoose";

class CowService {

    calculateAgeInMonths(birthDate) {
        if (!birthDate) return 0;

        const dob = new Date(birthDate);
        const today = new Date();

        let months =
            (today.getFullYear() - dob.getFullYear()) * 12 +
            (today.getMonth() - dob.getMonth());

        if (today.getDate() < dob.getDate()) {
            months -= 1;
        }

        return Math.max(months, 0);
    }

    async createCow(data) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            const newTagId = await this.generateTagId();

            const cowIdgenrated = `COW-${newTagId.toString().padStart(3, "0")}`;

            const ageInMonths = this.calculateAgeInMonths(data.birthDate);


            const cowData = {
                cowId: cowIdgenrated,
                tagId: newTagId,
                name: data.name || null,
                breed: data.breed || null,
                birthDate: data.birthDate || null,
                ageInMonths: ageInMonths || 0,
                color: data.color || null,
                weight: data.weight || 0,
                status: data.status || "Active",
            };

            const cow = await cowRepository.create(cowData, { session });


            await session.commitTransaction();
            session.endSession();

            return {
                cow,
                lactationCycle,
                message: "Cow created with default lactation + milking record",
            };

        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            throw error;
        }
    }

    async getCowLactationHistory(cowId) {
        const cow = await cowRepository.getById(cowId);
        if (!cow) throw new Error("Cow not found");

        const lactations = await lactationCycleRepository.findByCowIdWithMilking(cowId);

        return {
            cow,
            lactationCycles: lactations
        };
    }



    async getAllCows() {
        return await cowRepository.getAll();

    }

    async getCow(id) {
        return await cowRepository.getById({ _id: id });
    }

    async updateCow(id, data) {
        return await cowRepository.update(id, data);
    }

    async deleteCow(id) {
        return await cowRepository.delete(id);
    }

    async generateTagId() {
        const lastCow = await cowRepository.findLastTag();

        if (!lastCow) {
            return 1;
        }

        return lastCow.tagId + 1;
    }

    async getCowsWithLactationSummary() {
        return await cowRepository.getAllWithLactationSummary();
    }

}

export default new CowService();
