const { ValidationException } = require('../exceptions/DomainExceptions');

class Product {
  constructor({ id, categoriaId, codigoBarras, nombre, descripcion, precioVenta, impuestoPorcentaje = 0, minStockAlerta, created_at, updated_at }) {
    if (!codigoBarras || typeof codigoBarras !== 'string' || codigoBarras.trim().length < 4) {
      throw new ValidationException('El código de barras es obligatorio y debe ser válido.');
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 3) {
      throw new ValidationException('El nombre del producto es obligatorio.');
    }

    const price = parseFloat(precioVenta);
    if (isNaN(price) || price <= 0) {
      throw new ValidationException('El precio de venta debe ser un número mayor a cero.');
    }

    const minStock = minStockAlerta !== undefined ? parseInt(minStockAlerta, 10) : 10;
    if (isNaN(minStock) || minStock < 0) {
      throw new ValidationException('El stock mínimo de alerta no puede ser negativo.');
    }

    const tax = Number(impuestoPorcentaje || 0);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      throw new ValidationException('El impuesto debe estar entre 0 y 100%.');
    }

    this.id = id;
    this.categoriaId = categoriaId;
    this.codigoBarras = codigoBarras.trim();
    this.nombre = nombre.trim();
    this.descripcion = descripcion ? descripcion.trim() : null;
    this.precioVenta = price;
    this.impuestoPorcentaje = tax;
    this.minStockAlerta = minStock;
    this.created_at = created_at || new Date();
    this.updated_at = updated_at || new Date();
  }
}

module.exports = Product;
