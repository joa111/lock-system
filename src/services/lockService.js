const logger = require('../config/logger');
const { randomBytes } = require('crypto');

class LockService {
  constructor(redisClient) {
    // Now expects a single Redis client, not Redlock
    this.redis = redisClient;
  }

  async acquireLock(eventId, sectionId, options = {}) {
    const lockKey = `booking:${eventId}:${sectionId}`;
    const lockValue = randomBytes(16).toString('hex');
    const ttl = options.ttl || parseInt(process.env.REDIS_TTL) || 5000;
    const maxRetries = options.maxRetries || 50;

    let attempt = 0;
    const startTime = Date.now();

    while (attempt < maxRetries) {
      try {
        // Try to acquire lock using SET NX (set if not exists)
        const result = await this.redis.set(lockKey, lockValue, {
          NX: true,  // Only set if key doesn't exist
          PX: ttl,   // Expire after ttl milliseconds
        });

        if (result === 'OK') {
          const acquisitionTime = Date.now() - startTime;
          logger.debug(`Lock acquired on attempt ${attempt + 1} in ${acquisitionTime}ms`);
          
          return { 
            lockKey, 
            lockValue, 
            acquisitionTime 
          };
        }

        // Lock exists, retry with backoff
        attempt++;
        if (attempt >= maxRetries) {
          logger.warn(`Lock timeout for ${lockKey} after ${attempt} attempts`);
          throw new Error('Lock acquisition timeout');
        }
        
        logger.debug(`Lock attempt ${attempt} failed: key already locked`);
        
        // Exponential backoff with jitter
        const backoff = Math.min(1000, 50 * Math.pow(2, attempt)) + Math.random() * 100;
        await new Promise(r => setTimeout(r, backoff));
        
      } catch (error) {
        if (error.message === 'Lock acquisition timeout') {
          throw error;
        }
        
        attempt++;
        logger.debug(`Lock attempt ${attempt} failed: ${error.message}`);
        
        if (attempt >= maxRetries) {
          logger.warn(`Lock timeout for ${lockKey} after ${attempt} attempts. Last error: ${error.message}`);
          throw new Error('Lock acquisition timeout');
        }
        
        const backoff = Math.random() * 100 + 50;
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  async releaseLock(lockData) {
    if (!lockData) return;
    
    const { lockKey, lockValue } = lockData;
    
    try {
      // Use Lua script to ensure we only delete our own lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      await this.redis.eval(script, {
        keys: [lockKey],
        arguments: [lockValue],
      });
      
      logger.debug('Lock released');
    } catch (error) {
      logger.warn('Error releasing lock (might be expired):', error.message);
    }
  }

  async withLock(eventId, sectionId, callback, options = {}) {
    let lockData;
    try {
      lockData = await this.acquireLock(eventId, sectionId, options);
      return await callback(lockData);
    } finally {
      if (lockData) await this.releaseLock(lockData);
    }
  }
}

module.exports = LockService;