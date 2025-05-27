// Middleware para eliminar a necessidade de try/catch em controladores assíncronos
const asyncHandler = (fn) => (req, res, next) => {
  // Envolve a função assíncrona em uma Promise para garantir que qualquer erro seja capturado
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // Se o erro já tiver um statusCode, usa-o, caso contrário, usa 500
    const statusCode = err.statusCode || 500;
    
    // Se o erro já tiver uma mensagem, usa-a, caso contrário, usa uma mensagem padrão
    const message = err.message || 'Erro interno do servidor';
    
    // Se houver erros de validação, extrai as mensagens de erro
    let errors;
    if (err.name === 'ValidationError') {
      errors = Object.values(err.errors).map((e) => e.message);
    }
    
    // Se for um erro de chave duplicada
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      errors = [`Já existe um registro com este ${field}: ${err.keyValue[field]}`];
    }
    
    // Log do erro em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro assíncrono:', {
        message: err.message,
        stack: err.stack,
        statusCode,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.id : 'Não autenticado'
      });
    }
    
    // Envia a resposta de erro
    res.status(statusCode).json({
      success: false,
      message,
      errors: errors || undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
};

module.exports = asyncHandler;
