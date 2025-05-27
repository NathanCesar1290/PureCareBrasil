const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Obter todas as categorias
// @route   GET /api/v1/categories
// @access  Público
exports.getCategories = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Obter árvore de categorias
// @route   GET /api/v1/categories/tree
// @access  Público
exports.getCategoryTree = asyncHandler(async (req, res, next) => {
  const categories = await Category.getCategoryTree();
  
  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

// @desc    Obter categoria por ID
// @route   GET /api/v1/categories/:id
// @access  Público
exports.getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id)
    .populate('parent', 'name slug')
    .populate('children', 'name slug description');

  if (!category) {
    return next(
      new ErrorResponse(`Categoria não encontrada com o ID ${req.params.id}`, 404)
    );
  }

  // Obter breadcrumb
  const breadcrumb = await category.getBreadcrumb();

  res.status(200).json({
    success: true,
    data: {
      ...category.toObject(),
      breadcrumb,
    },
  });
});

// @desc    Criar nova categoria
// @route   POST /api/v1/categories
// @access  Privado/Admin
exports.createCategory = asyncHandler(async (req, res, next) => {
  // Adicionar usuário ao req.body
  req.body.createdBy = req.user.id;

  // Se for uma subcategoria, verificar se a categoria pai existe
  if (req.body.parent) {
    const parentCategory = await Category.findById(req.body.parent);
    if (!parentCategory) {
      return next(
        new ErrorResponse(
          `Categoria pai não encontrada com o ID ${req.body.parent}`,
          404
        )
      );
    }
  }

  const category = await Category.create(req.body);

  // Se for uma subcategoria, adicionar à matriz de filhos da categoria pai
  if (category.parent) {
    await Category.findByIdAndUpdate(
      category.parent,
      { $addToSet: { children: category._id } },
      { new: true, runValidators: true }
    );
  }

  res.status(201).json({
    success: true,
    data: category,
  });
});

// @desc    Atualizar categoria
// @route   PUT /api/v1/categories/:id
// @access  Privado/Admin
exports.updateCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    return next(
      new ErrorResponse(`Categoria não encontrada com o ID ${req.params.id}`, 404)
    );
  }

  // Verificar se a nova categoria pai existe
  if (req.body.parent) {
    const parentCategory = await Category.findById(req.body.parent);
    if (!parentCategory) {
      return next(
        new ErrorResponse(
          `Categoria pai não encontrada com o ID ${req.body.parent}`,
          404
        )
      );
    }
    
    // Evitar que uma categoria seja seu próprio pai
    if (req.body.parent === req.params.id) {
      return next(
        new ErrorResponse('Uma categoria não pode ser pai de si mesma', 400)
      );
    }
    
    // Evitar loops na árvore de categorias
    const isDescendant = await isDescendantCategory(req.params.id, req.body.parent);
    if (isDescendant) {
      return next(
        new ErrorResponse('Não é possível definir uma categoria filha como pai', 400)
      );
    }
  }

  // Se a categoria pai foi alterada, atualizar as referências
  if (req.body.parent && req.body.parent !== category.parent?.toString()) {
    // Remover da lista de filhos da categoria pai antiga
    if (category.parent) {
      await Category.findByIdAndUpdate(
        category.parent,
        { $pull: { children: category._id } },
        { new: true, runValidators: true }
      );
    }
    
    // Adicionar à lista de filhos da nova categoria pai
    await Category.findByIdAndUpdate(
      req.body.parent,
      { $addToSet: { children: category._id } },
      { new: true, runValidators: true }
    );
  }

  // Atualizar a categoria
  category = await Category.findByIdAndUpdate(req.params.id, 
    { 
      ...req.body, 
      updatedBy: req.user.id 
    }, 
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: category,
  });
});

// @desc    Deletar categoria
// @route   DELETE /api/v1/categories/:id
// @access  Privado/Admin
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(
      new ErrorResponse(`Categoria não encontrada com o ID ${req.params.id}`, 404)
    );
  }

  // Verificar se a categoria tem produtos associados
  const productCount = await mongoose.model('Product').countDocuments({ 
    category: category._id 
  });

  if (productCount > 0) {
    return next(
      new ErrorResponse(
        `Não é possível excluir a categoria pois existem ${productCount} produtos associados a ela`,
        400
      )
    );
  }

  // Remover a imagem do Cloudinary se existir
  if (category.image && category.image !== 'no-photo.jpg') {
    await deleteFromCloudinary(category.image);
  }

  // Remover a categoria (os middlewares cuidarão das referências)
  await category.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Fazer upload de imagem para categoria
// @route   PUT /api/v1/categories/:id/image
// @access  Privado/Admin
exports.uploadCategoryImage = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(
      new ErrorResponse(`Categoria não encontrada com o ID ${req.params.id}`, 404)
    );
  }

  if (!req.files) {
    return next(new ErrorResponse('Por favor, envie um arquivo de imagem', 400));
  }

  const file = req.files.file;

  // Verificar se o arquivo é uma imagem
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse('Por favor, envie um arquivo de imagem válido', 400));
  }

  // Verificar o tamanho da imagem
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Por favor, envie uma imagem menor que ${process.env.MAX_FILE_UPLOAD / 1000}KB`,
        400
      )
    );
  }

  // Se já existir uma imagem, remover a antiga
  if (category.image && category.image !== 'no-photo.jpg') {
    await deleteFromCloudinary(category.image);
  }

  // Fazer upload para o Cloudinary
  const result = await uploadToCloudinary(file.tempFilePath, 'categories');

  // Atualizar a categoria com a nova imagem
  category.image = result.secure_url;
  category.updatedBy = req.user.id;
  await category.save();

  // Remover arquivo temporário
  fs.unlinkSync(file.tempFilePath);

  res.status(200).json({
    success: true,
    data: category,
  });
});

// @desc    Obter produtos de uma categoria
// @route   GET /api/v1/categories/:id/products
// @access  Público
exports.getCategoryProducts = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(
      new ErrorResponse(`Categoria não encontrada com o ID ${req.params.id}`, 404)
    );
  }

  // Obter todas as subcategorias (incluindo a própria categoria)
  const categoryIds = await getCategoryWithChildrenIds(category._id);
  
  // Construir a query para buscar produtos em qualquer uma das categorias
  req.query.category = { $in: categoryIds };
  
  // Usar o advancedResults para paginação, filtros, etc.
  return exports.getProducts(req, res, next);
});

// Função auxiliar para obter todos os IDs de categorias filhas (incluindo a própria categoria)
async function getCategoryWithChildrenIds(categoryId) {
  const categoryIds = [categoryId];
  
  // Função recursiva para obter IDs de subcategorias
  const getChildrenIds = async (parentId) => {
    const children = await Category.find({ parent: parentId }, '_id');
    
    for (const child of children) {
      categoryIds.push(child._id);
      await getChildrenIds(child._id);
    }
  };
  
  await getChildrenIds(categoryId);
  return categoryIds;
}

// Função auxiliar para verificar se uma categoria é descendente de outra
async function isDescendantCategory(categoryId, potentialParentId) {
  // Se for a mesma categoria, não é descendente
  if (categoryId.toString() === potentialParentId.toString()) {
    return false;
  }
  
  let current = await Category.findById(categoryId);
  
  while (current && current.parent) {
    if (current.parent.toString() === potentialParentId.toString()) {
      return true;
    }
    current = await Category.findById(current.parent);
  }
  
  return false;
}
