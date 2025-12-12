const redis = require('redis');
const Redlock = require('redlock');
const logger = require('./logger');

class RedisConnection {
  static async connect() {
    try {
      const redisNodes = (process.env.REDIS_NODES || 'localhost:6379')
        .split(',')
        .map(node => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port) };
        });

        const clients = await Promise.all(redisNodes.map(async (node) => {
          const client = redis.createClient({
            socket: { host: node.host, port: node.port },
            password: process.env.REDIS_PASSWORD || undefined,
          });
          await client.connect();
          return client;
        }));
  
        logger.info(`✅ Redis connected to ${clients.length} node(s)`);
  

      const redlock = new Redlock(clients, {
        driftFactor: 0.01,
        retryCount: 3,
        retryDelay: 200,
        retryJitter: 200,
      });

      return { clients, redlock };
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }
}

module.exports = RedisConnection;
