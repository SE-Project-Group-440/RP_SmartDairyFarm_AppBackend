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

}

export default new CowRepository();
