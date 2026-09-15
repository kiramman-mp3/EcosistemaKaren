class ProductController {
  constructor(getProductsUC, getProductByBarcodeUC, createProductUC) {
    this.getProductsUC = getProductsUC;
    this.getProductByBarcodeUC = getProductByBarcodeUC;
    this.createProductUC = createProductUC;
  }

  async getProducts(req, res, next) {
    try {
      const products = await this.getProductsUC.execute();
      res.json({
        success: true,
        count: products.length,
        data: products
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
}

module.exports = ProductController;
