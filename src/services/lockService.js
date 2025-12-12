const logger = require('../config/logger');

class LockService {
  constructor(redlock) {
    this.redlock = redlock;
  }

  async acquireLock(eventId, sectionId, options = {}) {
    const lockKey = `booking:${eventId}:${sectionId}`;
    const ttl = options.ttl || parseInt(process.env.REDIS_TTL) || 5000;
    const maxRetries = options.maxRetries || 50;

    let attempt = 0;
    const startTime = Date.now();

    while (attempt < maxRetries) {
      try {
        // Redlock v5 uses .acquire() and expects an array of keys
        const lock = await this.redlock.acquire([lockKey], ttl);
        
        const acquisitionTime = Date.now() - startTime;
        
        // ✅ FIX: Log success message instead of referencing non-existent error
        logger.debug(`Lock acquired on attempt ${attempt + 1} in ${acquisitionTime}ms`);
        
        // v5 lock object structure
        return { lock, lockId: lock.value, acquisitionTime };
      } catch (error) {
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

  async releaseLock(lock) {
    try {
      await lock.release();
      logger.debug('Lock released');
    } catch (error) {
      logger.warn('Error releasing lock (might be expired):', error.message);
    }
  }

  async withLock(eventId, sectionId, callback, options = {}) {
    let lock;
    try {
      const lockData = await this.acquireLock(eventId, sectionId, options);
      lock = lockData.lock;
      return await callback(lockData);
    } finally {
      if (lock) await this.releaseLock(lock);
    }
  }
}

module.exports = LockService;