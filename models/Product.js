const mongoose = require('mongoose');
const slugify = require('slugify');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Por favor, adicione um nome'],
      trim: true,
      maxlength: [100, 'O nome não pode ter mais que 100 caracteres'],
    },
    slug: String,
    description: {
      type: String,
      required: [true, 'Por favor, adicione uma descrição'],
      maxlength: [2000, 'A descrição não pode ter mais que 2000 caracteres'],
    },
    richDescription: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: 'no-photo.jpg',
    },
    images: [
      {
        type: String,
      },
    ],
    brand: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Por favor, adicione um preço'],
      min: [0, 'O preço deve ser maior ou igual a zero'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Por favor, selecione uma categoria'],
    },
    subCategory: {
      type: String,
      required: [true, 'Por favor, selecione uma subcategoria'],
      enum: [
        'Eletrônicos',
        'Roupas',
        'Casa',
        'Beleza',
        'Esportes',
        'Outros',
      ],
    },
    countInStock: {
      type: Number,
      required: [true, 'Por favor, adicione a quantidade em estoque'],
      min: [0, 'A quantidade em estoque deve ser maior ou igual a zero'],
      default: 0,
    },
    rating: {
      type: Number,
      min: [1, 'A avaliação deve ser no mínimo 1'],
      max: [5, 'A avaliação deve ser no máximo 5'],
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [String],
    warranty: {
      type: Number,
      default: 0, // em meses
    },
    weight: {
      type: Number,
      default: 0, // em gramas
    },
    dimensions: {
      length: { type: Number, default: 0 }, // em cm
      width: { type: Number, default: 0 }, // em cm
      height: { type: Number, default: 0 }, // em cm
    },
    specifications: [
      {
        name: String,
        value: String,
      },
    ],
    sku: String,
    barcode: String,
    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    discountStartDate: Date,
    discountEndDate: Date,
    shippingClass: {
      type: String,
      enum: ['standard', 'express', 'free'],
      default: 'standard',
    },
    taxStatus: {
      type: String,
      enum: ['taxable', 'shipping', 'none'],
      default: 'taxable',
    },
    taxClass: {
      type: String,
      default: 'standard',
    },
    purchaseNote: String,
    enableReviews: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      min: [1, 'A avaliação deve ser no mínimo 1'],
      max: [5, 'A avaliação deve ser no máximo 5'],
      set: (val) => Math.round(val * 10) / 10, // 3.6666 -> 3.7
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    seo: {
      title: String,
      description: String,
      keywords: [String],
      canonicalUrl: String,
      ogTitle: String,
      ogDescription: String,
      ogImage: String,
      twitterCard: String,
      twitterTitle: String,
      twitterDescription: String,
      twitterImage: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Criar slug do produto a partir do nome
ProductSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

// Cascade delete de avaliações quando um produto for deletado
ProductSchema.pre('remove', async function (next) {
  await this.model('Review').deleteMany({ product: this._id });
  next();
});

// Reverter o populate com virtuals
ProductSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  justOne: false,
});

// Criar índice para busca de texto
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Criar índice para campos frequentemente consultados
ProductSchema.index({ category: 1, subCategory: 1, price: 1, rating: -1 });

// Método estático para obter a classificação média e atualizar o produto
ProductSchema.statics.getAverageRating = async function (productId) {
  const obj = await this.model('Review').aggregate([
    {
      $match: { product: productId },
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  try {
    await this.model('Product').findByIdAndUpdate(productId, {
      averageRating: obj[0] ? obj[0].averageRating : 0,
    });
  } catch (err) {
    console.error(err);
  }
};

// Chamar getAverageRating após salvar uma avaliação
ProductSchema.post('save', function () {
  this.constructor.getAverageRating(this._id);
});

// Chamar getAverageRating antes de remover uma avaliação
ProductSchema.pre('remove', function () {
  this.constructor.getAverageRating(this._id);
});

module.exports = mongoose.model('Product', ProductSchema);
