const mongoose = require('mongoose');
const slugify = require('slugify');

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Por favor, adicione um nome para a categoria'],
      trim: true,
      unique: true,
      maxlength: [50, 'O nome não pode ter mais que 50 caracteres'],
    },
    slug: String,
    description: {
      type: String,
      maxlength: [500, 'A descrição não pode ter mais que 500 caracteres'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    image: {
      type: String,
      default: 'no-photo.jpg',
    },
    icon: {
      type: String,
      default: 'fa-folder',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


// Criar slug do nome da categoria
CategorySchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

// Cascade delete - remover subcategorias quando uma categoria for removida
CategorySchema.pre('remove', async function (next) {
  // Remover esta categoria da matriz 'children' da categoria pai
  if (this.parent) {
    await this.model('Category').updateMany(
      { _id: this.parent },
      { $pull: { children: this._id } }
    );
  }


  // Remover subcategorias
  await this.model('Category').deleteMany({ parent: this._id });
  
  // Remover referência em produtos
  await this.model('Product').updateMany(
    { category: this._id },
    { $unset: { category: '' } }
  );
  
  next();
});

// Reverter o populate com virtuals
CategorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  justOne: false,
});

// Criar índice para busca de texto
CategorySchema.index({ name: 'text', description: 'text' });

// Método para obter a árvore de categorias
CategorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find({ parent: null })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'children',
      select: 'name slug description image icon',
      options: { sort: { order: 1, name: 1 } },
      populate: {
        path: 'children',
        select: 'name slug description image icon',
        options: { sort: { order: 1, name: 1 } },
      },
    });
  return categories;
};

// Método para obter o caminho da categoria (breadcrumb)
CategorySchema.methods.getBreadcrumb = async function () {
  const breadcrumb = [];
  let current = this;

  while (current) {
    breadcrumb.unshift({
      name: current.name,
      slug: current.slug,
      id: current._id,
    });
    
    if (current.parent) {
      current = await this.model('Category').findById(current.parent);
    } else {
      current = null;
    }
  }

  return breadcrumb;
};

// Middleware para atualizar a contagem de produtos
CategorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// Atualizar contagem de produtos
CategorySchema.statics.updateProductCount = async function (categoryId) {
  const count = await this.model('Product').countDocuments({ category: categoryId });
  
  // Atualizar a contagem na categoria
  await this.findByIdAndUpdate(categoryId, { productCount: count });
  
  // Atualizar a contagem nos pais
  const category = await this.findById(categoryId);
  if (category.parent) {
    await this.updateProductCount(category.parent);
  }
};

// Atualizar contagem após salvar/remover produto
CategorySchema.post('save', function (doc) {
  if (doc.parent) {
    this.model('Category').updateProductCount(doc.parent);
  }
});

module.exports = mongoose.model('Category', CategorySchema);
