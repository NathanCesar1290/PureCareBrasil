const express = require('express');
const path = require('path');

// Importar rotas
const authRoutes = require('./authRoutes');
// Importar outros roteadores aqui quando criados
// const productRoutes = require('./productRoutes');
// const orderRoutes = require('./orderRoutes');
// const userRoutes = require('./userRoutes');
// const reviewRoutes = require('./reviewRoutes');

const router = express.Router();

// Configuração de rotas da API
const apiRoutes = [
  {
    path: '/auth',
    route: authRoutes
  },
  // Adicionar outras rotas aqui
  // {
  //   path: '/products',
  //   route: productRoutes
  // },
];

// Registrar rotas da API
apiRoutes.forEach(route => {
  router.use(`/api/v1${route.path}`, route.route);
});

// Se nenhuma rota da API for encontrada
router.use('/api/v1/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota da API não encontrada'
  });
});

// Se nenhuma rota for encontrada
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

module.exports = router;
