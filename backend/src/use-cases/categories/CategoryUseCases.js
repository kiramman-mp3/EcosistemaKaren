class GetCategories {
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  async execute() {
    return await this.categoryRepository.findAll();
  }
}

class CreateCategory {
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  async execute(data) {
    return await this.categoryRepository.save(data);
  }
}

module.exports = {
  GetCategories,
  CreateCategory
};
