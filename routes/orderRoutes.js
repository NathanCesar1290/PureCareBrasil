const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { body, validationResult } = require('express-validator');

// Middleware de validação para criação de pedido
const validateOrder = [
    body('shippingAddress').notEmpty().withMessage('Endereço de entrega é obrigatório'),
    body('paymentMethod').notEmpty().withMessage('Método de pagamento é obrigatório'),
    body('items').isArray().withMessage('Itens do pedido são obrigatórios')
];

// Criar novo pedido
router.post('/', [auth, validateOrder], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        // Verificar se todos os itens estão disponíveis
        const items = req.body.items;
        const promises = items.map(async (item) => {
            const product = await Product.findById(item.product);
            if (!product || !product.hasStock(item.quantity)) {
                return null;
            }
            return product;
        });

        const products = await Promise.all(promises);
        if (products.some(p => !p)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Um ou mais itens não estão disponíveis' 
            });
        }

        // Calcular total do pedido
        const total = items.reduce((sum, item) => {
            const product = products.find(p => p._id.toString() === item.product);
            return sum + (item.quantity * product.price);
        }, 0);

        // Criar novo pedido
        const order = new Order({
            user: req.user.id,
            items,
            shippingAddress: req.body.shippingAddress,
            paymentMethod: req.body.paymentMethod,
            total,
            status: 'pendente'
        });

        // Atualizar estoque dos produtos
        const updatePromises = items.map(async (item) => {
            const product = await Product.findById(item.product);
            product.stock -= item.quantity;
            await product.save();
        });

        await Promise.all(updatePromises);
        await order.save();

        // Limpar carrinho do usuário
        const cart = await Cart.findOne({ user: req.user.id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        res.status(201).json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Listar pedidos do usuário
router.get('/', [auth], async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .populate('items.product')
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Listar pedidos (admin)
router.get('/admin', [auth, admin], async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name')
            .populate('items.product')
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Atualizar status do pedido (admin)
router.put('/:id/status', [auth, admin], async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }

        order.status = req.body.status;
        await order.save();

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cancelar pedido
router.delete('/:id', [auth], async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }

        if (order.user.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Acesso não autorizado' });
        }

        if (order.status !== 'pendente') {
            return res.status(400).json({ 
                success: false, 
                message: 'Pedido não pode ser cancelado neste status' 
            });
        }

        // Restaurar estoque dos produtos
        const updatePromises = order.items.map(async (item) => {
            const product = await Product.findById(item.product);
            product.stock += item.quantity;
            await product.save();
        });

        await Promise.all(updatePromises);
        await order.deleteOne();

        res.json({ success: true, message: 'Pedido cancelado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
