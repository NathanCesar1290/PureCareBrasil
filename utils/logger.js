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

// Adicion cores para os níveis de log
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
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  const syslogLevel = {
    error: 3, // Error
    warn: 4, // Warning
    info: 6, // Information
    debug: 7, // Debug
    verbose: 7, // Debug
    silly: 7 // Debug
  }[level];
  
  return `<${syslogLevel}>1 ${timestamp} ${process.env.RENDER_SERVICE_NAME || 'purecarebrasil'} ${process.env.NODE_ENV} ${process.pid} - ${stack || message}${metaStr ? `\n${metaStr}` : ''}`;
});

// Configuração dos logs em desenvolvimento
const developmentLogger = winston.createLogger({
  level: 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json(),
    winston.format.errors({ stack: true }),
    align(),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        align(),
        logFormat
      )
    }),
    new winston.transports.Syslog({
      host: 'localhost',
      port: 514,
      facility: 'user',
      label: 'purecarebrasil-dev'
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
});

// Configuração dos logs em produção
const productionLogger = winston.createLogger({
  level: process.env.RENDER_LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json(),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Syslog({
      host: 'localhost',
      port: 514,
      facility: 'user',
      label: process.env.RENDER_SERVICE_NAME || 'purecarebrasil'
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      ...logRotation
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      ...logRotation
    })
  ],
  exceptionHandlers: [
    new winston.transports.Syslog({
      host: 'localhost',
      port: 514,
      facility: 'user',
      label: `${process.env.RENDER_SERVICE_NAME || 'purecarebrasil'}-exceptions`
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      ...logRotation
    })
  ],
  rejectionHandlers: [
    new winston.transports.Syslog({
      host: 'localhost',
      port: 514,
      facility: 'user',
      label: `${process.env.RENDER_SERVICE_NAME || 'purecarebrasil'}-rejections`
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      ...logRotation
    })
  ],
  exitOnError: false
});

// Escolhe o logger baseado no ambiente
const logger = process.env.NODE_ENV === 'production' ? productionLogger : developmentLogger;

module.exports = logger;
