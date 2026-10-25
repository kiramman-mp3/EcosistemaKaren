const crypto = require('node:crypto');
const { NotFoundException, ValidationException, ConflictException, ForbiddenException } = require('../../domain/exceptions/DomainExceptions');
const Product = require('../../domain/entities/Product');
const { MEDIA_URL_PREFIX, isMediaPath } = require('../../infrastructure/media/mediaPaths');

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
      throw new ConflictException(`Ya existe un producto registrado con el código de barras '${productData.codigoBarras}'.`);
    }

    const product = new Product(productData);
    return await this.productRepository.save(product);
  }
}

// Foto de un producto: se comprime y normaliza (ver SharpImageProcessor), se guarda con un nombre que incluye
// el hash de su contenido (cada foto nueva tiene URL nueva y las cachés de apps y portal no muestran la vieja)
// y se actualiza el producto. El worker de sincronización la copia al portal. La foto anterior se borra si
// ningún otro producto la usa.
class SetProductImage {
  constructor({ productRepository, imageProcessor, mediaStorage }) {
    this.productRepository = productRepository;
    this.imageProcessor = imageProcessor;
    this.mediaStorage = mediaStorage;
  }

  async execute(productId, upload) {
    if (!Buffer.isBuffer(upload) || upload.length === 0) {
      throw new ValidationException('Debe enviar la foto del producto en el cuerpo de la solicitud.');
    }
    const product = await this.productRepository.findById(productId);
    if (!product) throw new NotFoundException(`Producto con ID '${productId}' no fue encontrado.`);

    const image = await this.imageProcessor.process(upload);
    const hash = crypto.createHash('sha256').update(image.data).digest('hex').slice(0, 10);
    const ruta = `${MEDIA_URL_PREFIX}productos/${product.codigoBarras}-${hash}.jpg`;
    if (!isMediaPath(ruta)) throw new ValidationException('El código de barras del producto no permite generar el nombre de la foto.');

    const previous = product.imagenUrl;
    if (ruta !== previous) {
      await this.mediaStorage.save(ruta, image.data);
      try {
        const updated = await this.productRepository.updateImage(productId, ruta);
        product.imagenUrl = updated?.imagenUrl ?? ruta;
      } catch (error) {
        await this.mediaStorage.remove(ruta).catch(() => {});
        throw error;
      }
      await this._removeIfUnused(previous);
    }
    return { product, image: { width: image.width, height: image.height, bytes: image.data.length, originalBytes: upload.length } };
  }

  // La foto anterior solo se borra del disco si es una ruta local y ya ningún producto la usa. Un fallo al
  // borrar no debe deshacer la actualización: queda un archivo huérfano, nada más.
  async _removeIfUnused(previous) {
    if (!isMediaPath(previous)) return;
    try {
      if ((await this.productRepository.countByImageUrl(previous)) === 0) await this.mediaStorage.remove(previous);
    } catch (error) {
      console.warn(`⚠️ No se pudo borrar la foto anterior ${previous}: ${error.message}`);
    }
  }
}

// El PVP solo lo cambia el ADMIN y siempre de forma explícita. Las reservas ya hechas conservan el
// precio con el que se apartaron (reserva_detalles.precio_unitario); el portal ve el nuevo en la
// siguiente sincronización del catálogo.
function assertCanChangePrice(actor) {
  if (!actor || actor.rol !== 'ADMIN') throw new ForbiddenException('Solo el ADMIN puede cambiar el PVP.');
}

function assertValidPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
    throw new ValidationException('El PVP debe ser un monto mayor a 0 y hasta 1.000.000.');
  }
  return price;
}

class UpdateProductPrice {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(productId, { precioVenta } = {}, actor) {
    assertCanChangePrice(actor);
    const price = assertValidPrice(precioVenta);
    const product = await this.productRepository.findById(productId);
    if (!product) throw new NotFoundException(`Producto con ID '${productId}' no fue encontrado.`);
    return this.productRepository.updatePriceWithAudit(product.id, price, { actorId: actor.id });
  }
}

class GetProductPriceHistory {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(productId, actor) {
    assertCanChangePrice(actor);
    const product = await this.productRepository.findById(productId);
    if (!product) throw new NotFoundException(`Producto con ID '${productId}' no fue encontrado.`);
    return this.productRepository.findPriceHistory(product.id);
  }
}

module.exports = {
  GetProducts,
  GetProductByBarcode,
  CreateProduct,
  SetProductImage,
  UpdateProductPrice,
  GetProductPriceHistory,
  assertCanChangePrice,
  assertValidPrice
};
