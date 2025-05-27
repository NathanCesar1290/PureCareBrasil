const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// Objeto para mapear códigos de erro para mensagens amigáveis
const errorMessages = {
  '23505': 'Já existe um registro com este valor único',
  '22P02': 'Formato de ID inválido',
  '42703': 'Campo de ordenação inválido',
  '23503': 'Violação de chave estrangeira',
  '23502': 'Violação de não nulo',
  '22001': 'Valor muito longo para o tipo',
  '22007': 'Formato de data inválido',
  '22008': 'Formato de intervalo de data inválido',
  '22012': 'Divisão por zero',
  '23000': 'Violação de restrição de chave estrangeira',
  '23001': 'Restrição de verificação violada',
  '23005': 'Restrição de unicidade violada',
  '23008': 'Chave estrangeira não encontrada',
  '23009': 'Restrição de verificação violada',
  '23010': 'Restrição de exclusão violada',
  '23011': 'Restrição de atualização violada',
  '23012': 'Restrição de restrição de verificação violada',
  '23013': 'Restrição de restrição de exclusão violada',
  '23014': 'Restrição de restrição de atualização violada',
  '23015': 'Restrição de restrição de restrição violada',
  '23016': 'Restrição de restrição de restrição de exclusão violada',
  '23017': 'Restrição de restrição de restrição de atualização violada',
  '23018': 'Restrição de restrição de restrição de restrição violada'
};

// Função para obter mensagem de erro amigável
const getFriendlyErrorMessage = (err) => {
  // Verificar se é um erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return messages.join('. ');
  }

  // Verificar se é um erro de chave duplicada
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return `Já existe um registro com este ${field}: ${err.keyValue[field]}`;
  }

  // Verificar se é um erro de cast (ID inválido)
  if (err.name === 'CastError') {
    return `Recurso não encontrado com o ID ${err.value}`;
  }

  // Verificar se é um erro JWT
  if (err.name === 'JsonWebTokenError') {
    return 'Token inválido';
  }

  if (err.name === 'TokenExpiredError') {
    return 'Token expirado';
  }

  // Verificar se é um erro de banco de dados PostgreSQL
  if (err.code && errorMessages[err.code]) {
    return errorMessages[err.code];
  }

  // Retornar a mensagem de erro padrão
  return err.message || 'Erro no servidor';
};

// Função para registrar o erro
const logError = (err, req) => {
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'Não autenticado'
  };

  if (process.env.NODE_ENV === 'development') {
    logger.error(JSON.stringify(errorDetails, null, 2));
  } else {
    // Em produção, não exponha a stack trace
    logger.error(JSON.stringify({
      message: err.message,
      statusCode: err.statusCode || 500,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip
    }, null, 2));
  }
};

// Middleware de tratamento de erros
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro
  logError(err, req);

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Erro de chave duplicada
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Valor duplicado para o campo ${field}`;
    error = new ErrorResponse(message, 400);
  }

  // Erro de cast (ID inválido)
  if (err.name === 'CastError') {
    const message = `Recurso não encontrado`;
    error = new ErrorResponse(message, 404);
  }

  // Resposta de erro
  res.status(error.statusCode || 500).json({
    success: false,
    error: getFriendlyErrorMessage(error) || 'Erro no servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
