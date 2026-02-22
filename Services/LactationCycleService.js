import repo from "../Repositories/LactationCycleRepository.js";

class LactationCycleService {
  create(data) {
    return repo.create(data);
  }

  getAll() {
    return repo.findAll();
  }

  getByCowId(cowId) {
    return repo.findByCowId(cowId);
  }

  getOne(id) {
    return repo.findById(id);
  }

  update(id, data) {
    return repo.update(id, data);
  }

  delete(id) {
    return repo.delete(id);
  }
}

export default new LactationCycleService();
