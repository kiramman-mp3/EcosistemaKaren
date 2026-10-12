const { NotFoundException, ValidationException } = require('../../domain/exceptions/DomainExceptions');
const Product = require('../../domain/entities/Product');

class GetProducts {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(filters = {}) {
    return await this.productRepository.findAll(filters);
  }
}

class GetProductByBarcode {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(barcode) {
    if (!barcode) {
      throw new ValidationException('Debe proporcionar un código de barras.');
    }
    const product = await this.productRepository.findByBarcode(barcode);
    if (!product) {
      throw new NotFoundException(`Producto con código de barras '${barcode}' no fue encontrado.`);
    }
    return product;
  }
}

class CreateProduct {
  constructor(productRepository, categoryRepository) {
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
  }

  async execute(productData) {
    if (productData.categoriaId) {
      const category = await this.categoryRepository.findById(productData.categoriaId);
      if (!category) {
        throw new NotFoundException(`La categoría con ID '${productData.categoriaId}' no existe.`);
      }
    }

    const existingProduct = await this.productRepository.findByBarcode(productData.codigoBarras);
    if (existingProduct) {
      throw new ValidationException(`Ya existe un producto registrado con el código de barras '${productData.codigoBarras}'.`);
    }

    const product = new Product(productData);
    return await this.productRepository.save(product);
  }
}

module.exports = {
  GetProducts,
  GetProductByBarcode,
  CreateProduct
};
