// Script de inicialização do MongoDB
// Executado automaticamente quando o contêiner do MongoDB é iniciado pela primeira vez

// Aguarda o MongoDB iniciar
db.getSiblingDB('admin').auth(
  process.env.MONGO_INITDB_ROOT_USERNAME,
  process.env.MONGO_INITDB_ROOT_PASSWORD
);

// Cria o banco de dados da aplicação
const dbName = 'minimal-shop';
const db = db.getSiblingDB(dbName);

// Cria o usuário da aplicação com permissões limitadas
db.createUser({
  user: process.env.MONGO_USERNAME || 'minimaluser',
  pwd: process.env.MONGO_PASSWORD || 'minimalpassword',
  roles: [
    {
      role: 'readWrite',
      db: dbName,
    },
  ],
});

// Cria índices iniciais
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ price: 1 });
db.products.createIndex({ category: 1 });

// Cria coleções iniciais se não existirem
const collections = ['products', 'users', 'orders', 'categories'];
collections.forEach((collection) => {
  if (!db.getCollectionNames().includes(collection)) {
    db.createCollection(collection);
  }
});

// Insere dados iniciais (opcional)
if (db.products.countDocuments() === 0) {
  db.products.insertMany([
    {
      name: 'Produto de Exemplo',
      description: 'Este é um produto de exemplo',
      price: 99.99,
      category: 'exemplo',
      stock: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
}

// Confirma a conclusão
print('Inicialização do MongoDB concluída com sucesso!');
