const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Configuração de retry strategy
const retryOptions = {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  wtimeoutMS: 10000,
  autoIndex: false,
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 60000,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  heartbeatFrequencyMS: 10000,
  minHeartbeatFrequencyMS: 1000,
  appname: 'PureCareBrasil',
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  tlsInsecure: false,
  directConnection: false,
  serverSelectionTryOnce: false,
  localThresholdMS: 15,
  waitQueueTimeoutMS: 0,
  waitQueueMultiple: 1,
  readPreference: 'primaryPreferred',
  readConcern: { level: 'majority' },
  writeConcern: { w: 'majority', wtimeout: 10000 },
  maxConnecting: 10,
  minPoolSize: 5,
  maxPoolSize: 50,
  minHeartbeatFrequencyMS: 1000,
  heartbeatFrequencyMS: 10000,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  waitQueueTimeoutMS: 0,
  waitQueueMultiple: 1,
  maxIdleTimeMS: 30000,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// Validação da URI do MongoDB
const validateMongoURI = (uri) => {
  if (!uri) throw new Error('MONGODB_URI não está configurada');
  if (!uri.startsWith('mongodb')) throw new Error('MONGODB_URI inválida');
  
  // Validação adicional para MongoDB Atlas
  if (uri.includes('@') && !uri.includes('mongodb+srv://')) {
    throw new Error('Para MongoDB Atlas, use a conexão mongodb+srv://');
  }
  
  // Validação de parâmetros obrigatórios
  const requiredParams = ['retryWrites=true', 'w=majority'];
  const missingParams = requiredParams.filter(param => !uri.includes(param));
  if (missingParams.length > 0) {
    throw new Error(`Parâmetros faltando na URI: ${missingParams.join(', ')}`);
  }
  
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
      useCreateIndex: true,
      useFindAndModify: false,
      poolSize: 20,
      bufferMaxEntries: 0,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      heartbeatFrequencyMS: 5000,
      minHeartbeatFrequencyMS: 500,
      autoIndex: false,
      retryWrites: true,
      w: 'majority',
      wtimeoutMS: 10000,
      readPreference: 'primaryPreferred',
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority', wtimeout: 5000 }
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
