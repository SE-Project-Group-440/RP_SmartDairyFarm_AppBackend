import Cow from "../Models/CowDetailsModel.js";

class CowRepository {
  async create(data) {
    return await Cow.create(data);
  }

  async getAll() {
    return await Cow.find();
  }

  async getById(id) {
    return await Cow.findById(id);
  }

  async update(id, data) {
    return await Cow.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await Cow.findByIdAndDelete(id);
  }

  async findLastTag() {
  return await Cow.findOne().sort({ tagId: -1 });
  }

   async getAllWithLactationSummary() {
    return Cow.aggregate([
      {
        $lookup: {
          from: "lactationcycles",
          localField: "_id",
          foreignField: "cowId",
          as: "lactations",
        },
      },
      {
        $lookup: {
          from: "milkingrecords",
          localField: "lactations._id",
          foreignField: "lactationCycle",
          as: "milkings",
        },
      },
      {
        $addFields: {
          latestLactation: { $arrayElemAt: ["$lactations", -1] },
          avgMilk: { $avg: "$milkings.dailyMilk" },
          lactationDay: { $size: "$milkings" },
        },
      },
      {
        $project: {
          name: 1,
          cowId: 1,
          breed: 1,
          birthDate: 1,
          ageInMonths: 1,
          status: 1,
          lactationRound: "$latestLactation.lactationRound",
          lactationDay: 1,
          avgMilk: { $round: ["$avgMilk", 2] },
        },
      },
    ]);}

}

export default new CowRepository();
