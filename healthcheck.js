const http = require('http');
const mongoose = require('mongoose');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 2000,
};

// Verifica a saúde da API
const checkApi = () => {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        console.error(`API returned status code: ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error('API health check failed:', error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('API health check timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
};

// Verifica a conexão com o MongoDB
const checkDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};

// Executa todas as verificações
const checkHealth = async () => {
  const [apiHealthy, dbHealthy] = await Promise.all([
    checkApi(),
    checkDatabase(),
  ]);

  if (apiHealthy && dbHealthy) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error('Health check failed');
    process.exit(1);
  }
};

checkHealth();
