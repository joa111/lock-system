const logger = require('../config/logger');
const crypto = require('crypto');

class LockService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  async acquireLock(eventId, sectionId, options = {}) {
    const lockKey = `booking:${eventId}:${sectionId}`;
    const ttl = options.ttl || parseInt(process.env.REDIS_TTL) || 60000;
    const maxRetries = options.maxRetries || 10;
    
    let attempt = 0;
    const startTime = Date.now();
    const lockId = crypto.randomUUID();

    while (attempt < maxRetries) {
      try {
        const acquired = await this.redisClient.set(lockKey, lockId, {
          EX: Math.floor(ttl / 1000), 
          NX: true 
        });

        if (acquired) {
          const acquisitionTime = Date.now() - startTime;
          logger.debug(`✅ Lock acquired in ${acquisitionTime}ms`);
          return { 
            lockId, 
            lockKey,
            acquisitionTime 
          };
        }


        attempt++;
        const backoff = Math.random() * 200 + 100; 
        await new Promise(r => setTimeout(r, backoff));

      } catch (error) {
        attempt++;
        logger.debug(`Lock attempt ${attempt} error: ${error.message}`);
        
        if (attempt >= maxRetries) {
          throw new Error('Lock acquisition timeout');
        }

        const backoff = Math.random() * 200 + 100;
        await new Promise(r => setTimeout(r, backoff));
      }
    }

    throw new Error('Lock acquisition timeout');
  }

  async releaseLock(lockKey, lockId) {
    try {
      await this.redisClient.del(lockKey);
      logger.debug('Lock released');
    } catch (error) {
      logger.warn('Error releasing lock:', error.message);
    }
  }

  async withLock(eventId, sectionId, callback, options = {}) {
    let lockData;
    try {
      lockData = await this.acquireLock(eventId, sectionId, options);
      return await callback(lockData);
    } finally {
      if (lockData) {
        await this.releaseLock(lockData.lockKey, lockData.lockId);
      }
    }
  }
}

module.exports = LockService;
