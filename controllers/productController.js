const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Obter todos os produtos
// @route   GET /api/v1/products
// @access  Público
exports.getProducts = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Obter produto por ID
// @route   GET /api/v1/products/:id
// @access  Público
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate({
      path: 'category',
      select: 'name description',
    })
    .populate({
      path: 'reviews',
      select: 'rating comment user',
      populate: {
        path: 'user',
        select: 'name',
      },
    })
    .populate({
      path: 'relatedProducts',
      select: 'name price image slug',
    });

  if (!product) {
    return next(
      new ErrorResponse(`Produto não encontrado com o ID ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Criar novo produto
// @route   POST /api/v1/products
// @access  Privado/Admin/Vendedor
exports.createProduct = asyncHandler(async (req, res, next) => {
  // Adicionar usuário ao req.body
  req.body.seller = req.user.id;

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product,
  });
});

// @desc    Atualizar produto
// @route   PUT /api/v1/products/:id
// @access  Privado/Admin/Vendedor
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Produto não encontrado com o ID ${req.params.id}`, 404)
    );
  }

  // Verificar se o usuário é o dono do produto ou admin
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `Usuário ${req.user.id} não está autorizado a atualizar este produto`,
        401
      )
    );
  }

  // Se o nome foi alterado, atualizar o slug
  if (req.body.name) {
    req.body.slug = slugify(req.body.name, { lower: true, strict: true });
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Deletar produto
// @route   DELETE /api/v1/products/:id
// @access  Privado/Admin/Vendedor
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Produto não encontrado com o ID ${req.params.id}`, 404)
    );
  }


  // Verificar se o usuário é o dono do produto ou admin
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `Usuário ${req.user.id} não está autorizado a excluir este produto`,
        401
      )
    );
  }

  // Remover imagens do Cloudinary
  if (product.images && product.images.length > 0) {
    for (const image of product.images) {
      await deleteFromCloudinary(image);
    }
  }

  await product.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Fazer upload de imagem para produto
// @route   PUT /api/v1/products/:id/image
// @access  Privado/Admin/Vendedor
exports.uploadProductImage = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Produto não encontrado com o ID ${req.params.id}`, 404)
    );
  }

  // Verificar se o usuário é o dono do produto ou admin
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `Usuário ${req.user.id} não está autorizado a atualizar este produto`,
        401
      )
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


  // Fazer upload para o Cloudinary
  const result = await uploadToCloudinary(file.tempFilePath, 'products');

  // Adicionar a nova imagem ao array de imagens do produto
  product.images.push({
    url: result.secure_url,
    public_id: result.public_id,
  });

  await product.save();

  // Remover arquivo temporário
  fs.unlinkSync(file.tempFilePath);

  res.status(200).json({
    success: true,
    data: product.images,
  });
});

// @desc    Remover imagem do produto
// @route   DELETE /api/v1/products/:id/image/:imageId
// @access  Privado/Admin/Vendedor
exports.deleteProductImage = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Produto não encontrado com o ID ${req.params.id}`, 404)
    );
  }

  // Verificar se o usuário é o dono do produto ou admin
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `Usuário ${req.user.id} não está autorizado a atualizar este produto`,
        401
      )
    );
  }

  // Encontrar a imagem a ser removida
  const imageIndex = product.images.findIndex(
    (img) => img._id.toString() === req.params.imageId
  );

  if (imageIndex === -1) {
    return next(
      new ErrorResponse(
        `Imagem não encontrada com o ID ${req.params.imageId}`,
        404
      )
    );
  }

  // Remover a imagem do Cloudinary
  await deleteFromCloudinary(product.images[imageIndex].public_id);

  // Remover a imagem do array
  product.images.splice(imageIndex, 1);

  await product.save();

  res.status(200).json({
    success: true,
    data: product.images,
  });
});

// @desc    Obter produtos por categoria
// @route   GET /api/v1/products/category/:categoryId
// @access  Público
exports.getProductsByCategory = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ category: req.params.categoryId });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

// @desc    Obter produtos em destaque
// @route   GET /api/v1/products/featured
// @access  Público
exports.getFeaturedProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ isFeatured: true }).limit(8);

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

// @desc    Obter produtos com desconto
// @route   GET /api/v1/products/discounted
// @access  Público
exports.getDiscountedProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    discount: { $gt: 0 },
    discountStartDate: { $lte: Date.now() },
    $or: [
      { discountEndDate: { $exists: false } },
      { discountEndDate: { $gte: Date.now() } },
    ],
  }).limit(8);

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

// @desc    Obter produtos relacionados
// @route   GET /api/v1/products/:id/related
// @access  Público
exports.getRelatedProducts = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Produto não encontrado com o ID ${req.params.id}`, 404)
    );
  }

  const relatedProducts = await Product.find({
    _id: { $ne: product._id },
    $or: [
      { category: product.category },
      { subCategory: product.subCategory },
      { tags: { $in: product.tags } },
    ],
  }).limit(4);

  res.status(200).json({
    success: true,
    count: relatedProducts.length,
    data: relatedProducts,
  });
});

// @desc    Atualizar estoque do produto
// @route   PUT /api/v1/products/:id/stock
// @access  Privado/Admin/Vendedor
exports.updateProductStock = asyncHandler(async (req, res, next) => {
  const { quantity, operation } = req.body;

  if (!quantity || !operation) {
    return next(
      new ErrorResponse('Por favor, forneça a quantidade e a operação', 400)
    );
  }

  if (!['add', 'subtract', 'set'].includes(operation)) {
    return next(
      new ErrorResponse(
        'Operação inválida. Use "add", "subtract" ou "set"',
        400
      )
    );
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Produto não encontrado com o ID ${req.params.id}`, 404)
    );
  }

  // Verificar se o usuário é o dono do produto ou admin
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `Usuário ${req.user.id} não está autorizado a atualizar este produto`,
        401
      )
    );
  }

  // Atualizar o estoque com base na operação
  if (operation === 'add') {
    product.countInStock += parseInt(quantity);
  } else if (operation === 'subtract') {
    if (product.countInStock < quantity) {
      return next(
        new ErrorResponse('Quantidade em estoque insuficiente', 400)
      );
    }
    product.countInStock -= parseInt(quantity);
  } else if (operation === 'set') {
    if (quantity < 0) {
      return next(new ErrorResponse('O estoque não pode ser negativo', 400));
    }
    product.countInStock = parseInt(quantity);
  }

  await product.save();

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Buscar produtos
// @route   GET /api/v1/products/search
// @access  Público
exports.searchProducts = asyncHandler(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new ErrorResponse('Por favor, forneça um termo de busca', 400));
  }

  const products = await Product.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ],
  });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});
