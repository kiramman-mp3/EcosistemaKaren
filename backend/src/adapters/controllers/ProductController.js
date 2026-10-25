class ProductController {
  constructor(getProductsUC, getProductByBarcodeUC, createProductUC, setProductImageUC) {
    this.getProductsUC = getProductsUC;
    this.getProductByBarcodeUC = getProductByBarcodeUC;
    this.createProductUC = createProductUC;
    this.setProductImageUC = setProductImageUC;
  }

  async getProducts(req, res, next) {
    try {
      const result = await this.getProductsUC.execute(req.query);
      res.json({
        success: true,
        count: result.items.length,
        total: result.total,
        limit: Number(req.query.limit),
        offset: Number(req.query.offset),
        data: result.items
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductByBarcode(req, res, next) {
    try {
      const { barcode } = req.params;
      const product = await this.getProductByBarcodeUC.execute(barcode);
      res.json({
        success: true,
        data: product
      });
    } catch (err) {
      next(err);
    }
  }

  async createProduct(req, res, next) {
    try {
      const product = await this.createProductUC.execute(req.body);
      res.status(201).json({
        success: true,
        message: 'Producto creado en el catálogo maestro.',
        data: product
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /products/:id/image: el cuerpo es la foto (binario); se comprime antes de guardarla.
  async setImage(req, res, next) {
    try {
      const { product, image } = await this.setProductImageUC.execute(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Foto del producto actualizada.',
        data: product,
        image
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
