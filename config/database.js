const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Configuração de retry strategy
const retryOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Força IPv4
  retryWrites: true,
  w: 'majority',
  wtimeoutMS: 10000,
  autoIndex: false,
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  heartbeatFrequencyMS: 10000,
  minHeartbeatFrequencyMS: 500,
  appname: 'PureCareBrasil',
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  tlsInsecure: false,
  directConnection: false,
  serverSelectionTryOnce: false,
  localThresholdMS: 15,
  waitQueueTimeoutMS: 0,
  waitQueueMultiple: 1
};

// Validação da URI do MongoDB
const validateMongoURI = (uri) => {
  if (!uri) throw new Error('MONGODB_URI não está configurada');
  if (!uri.startsWith('mongodb')) throw new Error('MONGODB_URI inválida');
  return uri;
};

const connectDB = async () => {
  try {
    const uri = validateMongoURI(process.env.MONGODB_URI);
    
    mongoose.set('strictQuery', false);
    mongoose.set('debug', process.env.NODE_ENV !== 'production');

    const conn = await mongoose.connect(uri, {
      ...retryOptions,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    
    // Configurar eventos de conexão
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection is established'.green);
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection is disconnected'.yellow);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB connection is reconnected'.green);
    });

  } catch (error) {
    logger.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;
