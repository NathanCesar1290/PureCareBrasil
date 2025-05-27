const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Carregar variáveis de ambiente
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

// Verificar variáveis de ambiente obrigatórias
const requiredEnvVars = ['MONGODB_URI', 'NODE_ENV', 'PORT', 'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX', 'ALLOWED_ORIGINS'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Variável de ambiente obrigatória não encontrada: ${varName}`);
  }
});

// Configuração do host e porta
const host = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000');

// Validar porta
if (isNaN(port) || port <= 0 || port > 65535) {
  throw new Error(`PORT inválida: ${process.env.PORT}`);
}

// Conectar ao banco de dados
connectDB();

// Importar rotas
const apiRoutes = require('./routes/api');
const healthRoutes = require('./health');

const app = express();

// Health check route (before other middlewares to avoid unnecessary processing)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

// Configuração de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "*.cloudinary.com"],
      connectSrc: ["'self'", "https:", "*.stripe.com", "*.sendgrid.net"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "data:"],
      frameSrc: ["'self'", "https:", "*.stripe.com"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
      blockAllMixedContent: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(mongoSanitize({
  replaceWith: '_'
}));

app.use(xss());

app.use(hpp({
  whitelist: ['quantity', 'price', 'rating']
}));

// Logging
app.use(morgan('combined', {
  stream: logger.stream
}));

// Configuração do body-parser
app.use(express.json({ 
  limit: '20mb',
  extended: true
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '20mb'
}));

// Configuração de upload de arquivos
app.use(fileupload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10
  },
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true
}));

// Configuração de cookies
app.use(cookieParser());

// Rotas
app.use('/api', apiRoutes);

// Rota para verificar status da API
app.get('/api/v1/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'PureCareBrasil API is running',
    timestamp: new Date().toISOString()
  });
});

// Tratamento de erros
app.use(errorHandler);

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Configuração de produção
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Iniciar o servidor
const server = app.listen(port, host, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on ${host}:${port}`.cyan.bold);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Node.js version: ${process.version}`);
  logger.info(`Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not connected'}`);
  
  // Log de informações adicionais em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Debug mode is enabled');
  }
}).on('error', (err) => {
  logger.error('Erro ao iniciar o servidor:', err);
  process.exit(1);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Encerra o processo apenas se não estiver em produção
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Encerra o processo apenas se não estiver em produção
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Encerramento gracioso do servidor
const gracefulShutdown = () => {
  logger.info('Recebido sinal de desligamento. Encerrando o servidor...');
  
  server.close(() => {
    logger.info('Servidor encerrado.');
    process.exit(0);
  });

  // Força o encerramento após 10 segundos
  setTimeout(() => {
    logger.error('Forçando o encerramento do servidor...');
    process.exit(1);
  }, 10000);
};

// Captura os sinais de encerramento
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Configuração de erro
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Error handling middleware
app.use(errorHandler);

// Handle production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Erro: ${err.message}`.red);
  // Fechar servidor e encerrar processo
  server.close(() => process.exit(1));
});
