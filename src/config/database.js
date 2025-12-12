const mongoose = require('mongoose');
const logger = require('./logger');

class DatabaseConnection {
  static async connect() {
    try {
      const options = {
        maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 50,
        minPoolSize: 10,
        socketTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT) || 5000,
        serverSelectionTimeoutMS: 5000,
        w: 'majority', 
        wtimeoutMS: 5000,
        retryWrites: process.env.MONGODB_RETRY_WRITES === 'true',
        maxIdleTimeMS: 30000,
      };

      await mongoose.connect(process.env.MONGODB_URI, options);
      logger.info('✅ MongoDB connected with connection pooling');
      
      return mongoose.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  static async disconnect() {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

module.exports = DatabaseConnection;
