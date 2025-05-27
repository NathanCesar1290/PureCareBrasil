const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Adicionar produto ao carrinho
router.post('/add', [auth], async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }

        if (!product.hasStock(quantity)) {
            return res.status(400).json({ success: false, message: 'Produto sem estoque suficiente' });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        
        if (!cart) {
            const newCart = new Cart({
                user: req.user.id,
                items: [{
                    product: productId,
                    quantity,
                    price: product.price
                }]
            });
            await newCart.save();
            return res.status(201).json({ success: true, cart: newCart });
        }

        // Verificar se o produto já está no carrinho
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        
        if (itemIndex !== -1) {
            // Atualizar quantidade
            cart.items[itemIndex].quantity += quantity;
        } else {
            // Adicionar novo item
            cart.items.push({
                product: productId,
                quantity,
                price: product.price
            });
        }

        await cart.save();
        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Atualizar quantidade de item no carrinho
router.put('/update/:itemId', [auth], async (req, res) => {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ user: req.user.id });
        
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Carrinho não encontrado' });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === req.params.itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item não encontrado no carrinho' });
        }

        const product = await Product.findById(cart.items[itemIndex].product);
        
        if (!product.hasStock(quantity)) {
            return res.status(400).json({ success: false, message: 'Produto sem estoque suficiente' });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();
        
        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remover item do carrinho
router.delete('/remove/:itemId', [auth], async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Carrinho não encontrado' });
        }

        cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
        await cart.save();
        
        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Obter carrinho do usuário
router.get('/', [auth], async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id })
            .populate('items.product')
            .populate('user', 'name');
        
        if (!cart) {
            return res.json({ success: true, cart: { items: [] } });
        }

        // Calcular total
        const total = cart.items.reduce((sum, item) => {
            return sum + (item.quantity * item.price);
        }, 0);

        res.json({ success: true, cart: { ...cart.toObject(), total } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Limpar carrinho
router.delete('/', [auth], async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        
        if (!cart) {
            return res.json({ success: true, message: 'Carrinho já está vazio' });
        }

        cart.items = [];
        await cart.save();
        
        res.json({ success: true, message: 'Carrinho limpo com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
