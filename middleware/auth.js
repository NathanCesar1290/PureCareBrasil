const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// Middleware para proteger rotas
const protect = async (req, res, next) => {
  let token;

  // Verificar se o token está no cabeçalho de autorização
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Verificar se o token está nos cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Verificar se o token existe
  if (!token) {
    return next(
      new ErrorResponse('Não autorizado a acessar esta rota', 401)
    );
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obter usuário do token
    req.user = await User.findById(decoded.id).select('-password');

    next();
  } catch (err) {
    return next(
      new ErrorResponse('Não autorizado a acessar esta rota', 401)
    );
  }
};

// Middleware para autorizar acesso baseado em função
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Usuário com a função ${req.user.role} não está autorizado a acessar esta rota`,
          403
        )
      );
    }
    next();
  };
};

// Middleware para verificar se o usuário é dono do recurso ou admin
const checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);

      // Verificar se o recurso existe
      if (!resource) {
        return next(
          new ErrorResponse(
            `Recurso não encontrado com o ID ${req.params.id}`,
            404
          )
        );
      }


      // Verificar se o usuário é o dono do recurso ou um administrador
      if (
        resource.user.toString() !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        return next(
          new ErrorResponse(
            `Usuário ${req.user.id} não está autorizado a atualizar este recurso`,
            401
          )
        );
      }


      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  protect,
  authorize,
  checkOwnership
};
