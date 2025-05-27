const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para atualizar timestamps
cartSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Método para calcular total do carrinho
cartSchema.methods.calculateTotal = function() {
    return this.items.reduce((total, item) => total + (item.quantity * item.price), 0);
};

// Método para verificar se há itens disponíveis
cartSchema.methods.hasAvailableItems = async function() {
    const promises = this.items.map(async (item) => {
        const product = await Product.findById(item.product);
        return product && product.hasStock(item.quantity);
    });
    
    const results = await Promise.all(promises);
    return results.every(result => result);
};

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
