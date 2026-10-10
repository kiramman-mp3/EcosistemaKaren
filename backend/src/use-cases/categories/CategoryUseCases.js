const { ValidationException } = require('../../domain/exceptions/DomainExceptions');

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
    const existing = await this.categoryRepository.findByName(data.nombre);
    if (existing) {
      throw new ValidationException(`Ya existe una categoría llamada '${existing.nombre}'.`);
    }
    return await this.categoryRepository.save(data);
  }
}

module.exports = {
  GetCategories,
  CreateCategory
};
