const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
    shippingAddress: {
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    paymentMethod: {
        type: String,
        enum: ['cartao', 'boleto', 'pix', 'transferencia'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pendente', 'pago', 'cancelado'],
        default: 'pendente'
    },
    status: {
        type: String,
        enum: ['pendente', 'processando', 'enviado', 'entregue', 'cancelado'],
        default: 'pendente'
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    trackingNumber: String,
    notes: String,
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
orderSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Método para calcular prazo de entrega
orderSchema.methods.calculateDeliveryTime = function() {
    const deliveryDays = {
        'pendente': 0,
        'processando': 2,
        'enviado': 5,
        'entregue': 0,
        'cancelado': 0
    };
    
    const days = deliveryDays[this.status] || 0;
    return new Date(this.updatedAt.getTime() + (days * 24 * 60 * 60 * 1000));
};

// Método para verificar se o pedido pode ser cancelado
orderSchema.methods.canBeCancelled = function() {
    return this.status === 'pendente' || this.status === 'processando';
};

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
