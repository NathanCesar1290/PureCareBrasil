const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  getCategoryTree,
  getCategoryProducts,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Category = require('../models/Category');

const router = express.Router({ mergeParams: true });

// Rotas públicas
router.get('/tree', getCategoryTree);
router.get(
  '/',
  advancedResults(Category, [
    { path: 'parent', select: 'name slug' },
    { path: 'children', select: 'name slug' },
  ]),
  getCategories
);
router.get('/:id', getCategory);

// Rotas protegidas (requer autenticação)
router.use(protect);

// Rotas de produtos por categoria (públicas)
router.get('/:id/products', getCategoryProducts);

// Rotas de administração (requerem permissão de admin)
router.use(authorize('admin', 'publisher'));

router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.put('/:id/image', uploadCategoryImage);

module.exports = router;