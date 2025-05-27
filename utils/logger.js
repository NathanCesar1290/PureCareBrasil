const winston = require('winston');
const { combine, timestamp, printf, colorize, align, json } = winston.format;
const fs = require('fs');
const path = require('path');

// Verificar e criar diretório de logs
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuração de rotação de logs
const logRotation = {
  maxFiles: 30, // Mantém 30 arquivos
  maxSize: '20m', // 20MB por arquivo
  zippedArchive: true, // Compacta arquivos antigos
  tailable: true, // Permite leitura em tempo real
  handleExceptions: true,
  humanReadableUnhandledException: true,
  json: true,
  eol: '\n'
};

// Adiciona cores para os níveis de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  verbose: 'cyan',
  silly: 'gray'
};

winston.addColors(colors);

// Formato personalizado para os logs
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  const stackStr = stack ? `\n${stack}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${stackStr}${metaStr}`;
});

// Configuração base dos logs
const baseLoggerConfig = {
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      ...logRotation
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      ...logRotation
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      ...logRotation
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      ...logRotation
    })
  ]
};

// Configuração dos logs em desenvolvimento
const developmentLogger = winston.createLogger({
  ...baseLoggerConfig,
  level: 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    align(),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        align(),
        logFormat
      )
    }),
    ...baseLoggerConfig.transports
  ]
});

// Configuração dos logs em produção
const productionLogger = winston.createLogger({
  ...baseLoggerConfig,
  level: process.env.RENDER_LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        logFormat
      )
    }),
    ...baseLoggerConfig.transports
  ],
  exitOnError: false
});

// Escolhe o logger baseado no ambiente
const logger = process.env.NODE_ENV === 'production' ? productionLogger : developmentLogger;

module.exports = logger;
