const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Middleware de validação
const validateProduct = [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('description').notEmpty().withMessage('Descrição é obrigatória'),
    body('price').isNumeric().withMessage('Preço deve ser um número'),
    body('stock').isNumeric().withMessage('Estoque deve ser um número'),
    body('category').notEmpty().withMessage('Categoria é obrigatória'),
    body('image').isURL().withMessage('URL da imagem inválida')
];

// Lista de produtos com paginação e filtros
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 12, category, search, sort } = req.query;
        const query = {};
        
        if (category) {
            query.category = category;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: sort ? { [sort]: 1 } : { createdAt: -1 },
            populate: 'category',
            customLabels: {
                totalDocs: 'total',
                docs: 'products',
                limit: 'perPage',
                page: 'currentPage',
                totalPages: 'totalPages'
            }
        };

        const products = await Product.paginate(query, options);
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Detalhes de um produto
router.get('/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug })
            .populate('category')
            .populate('reviews.user', 'name');
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }

        // Incrementar visualizações
        product.views = (product.views || 0) + 1;
        await product.save();

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Adicionar produto (admin)
router.post('/', [auth, admin, validateProduct], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const category = await Category.findById(req.body.category);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        }

        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Atualizar produto (admin)
router.put('/:id', [auth, admin, validateProduct], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remover produto (admin)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
        res.json({ success: true, message: 'Produto removido com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Adicionar review (usuário)
router.post('/:slug/reviews', [auth], async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }

        // Verificar se o usuário já avaliou
        const hasReviewed = product.reviews.some(review => review.user.toString() === req.user.id);
        if (hasReviewed) {
            return res.status(400).json({ success: false, message: 'Você já avaliou este produto' });
        }

        // Adicionar review
        product.reviews.push({
            user: req.user.id,
            rating: req.body.rating,
            comment: req.body.comment
        });

        // Recalcular média de avaliações
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.rating = totalRating / product.reviews.length;

        await product.save();
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
