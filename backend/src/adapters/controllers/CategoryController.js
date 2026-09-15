class CategoryController {
  constructor(getCategoriesUC, createCategoryUC) {
    this.getCategoriesUC = getCategoriesUC;
    this.createCategoryUC = createCategoryUC;
  }

  async getCategories(req, res, next) {
    try {
      const categories = await this.getCategoriesUC.execute();
      res.json({
        success: true,
        count: categories.length,
        data: categories
      });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await this.createCategoryUC.execute(req.body);
      res.status(201).json({
        success: true,
        message: 'Categoría creada con éxito.',
        data: category
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryController;
