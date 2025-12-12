require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const logger = require('./src/config/logger');
const BookingService = require('./src/services/bookingService');
const LockService = require('./src/services/lockService');
const Event = require('./src/models/Event');
const metrics = require('./src/utils/metrics');

const app = express();

// ✅ CRITICAL: JSON parser FIRST, before all routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Body: ${JSON.stringify(req.body)}`);
  next();
});

let bookingService;
let lockService;

// ==================== ROUTES ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
  res.json(metrics.getMetrics());
});

app.post('/api/events', async (req, res) => {
  try {
    console.log('📋 Creating event, received body:', req.body);
    
    const { name, description, sections } = req.body;
    if (!name || !sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: 'Invalid: need name and sections array' });
    }

    const sectionsData = sections.map(s => ({
      name: s.name,
      price: s.price,
      capacity: s.capacity,
      remaining: s.capacity,
    }));

    const event = new Event({
      name,
      description: description || '',
      sections: sectionsData,
      status: 'live',
    });

    await event.save();
    logger.info(`✅ Event created: ${event._id}`);

    res.status(201).json({ 
      success: true, 
      data: event.toObject() 
    });

  } catch (error) {
    logger.error('❌ Event creation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/bookings', async (req, res) => {
  try {
    console.log('📝 Booking request, received body:', req.body);
    
    const { eventId, sectionId, qty, userId } = req.body;

    console.log(`  eventId: ${eventId} (type: ${typeof eventId})`);
    console.log(`  sectionId: ${sectionId} (type: ${typeof sectionId})`);
    console.log(`  qty: ${qty} (type: ${typeof qty})`);
    console.log(`  userId: ${userId} (type: ${typeof userId})`);

    if (!eventId || !sectionId || !qty || !userId) {
      const missing = [];
      if (!eventId) missing.push('eventId');
      if (!sectionId) missing.push('sectionId');
      if (!qty) missing.push('qty');
      if (!userId) missing.push('userId');
      throw new Error(`Missing fields: ${missing.join(', ')}`);
    }

    if (typeof qty !== 'number' || qty <= 0) {
      throw new Error('qty must be a positive number');
    }

    bookingService.validateBookingRequest(eventId, sectionId, qty, userId);
    metrics.recordBookingAttempt();

    const result = await bookingService.createBooking(eventId, sectionId, qty, userId);
    metrics.recordBookingSuccess();

    res.status(201).json({
      success: true,
      data: result.booking,
      lockAcquisitionTime: result.lockAcquisitionTime,
    });
  } catch (error) {
    metrics.recordBookingFailure();
    logger.error('❌ Booking failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/bookings', async (req, res) => {
  try {
    const { eventId, userId, page = 1, limit = 20 } = req.query;
    const result = await bookingService.getBookings(
      { eventId, userId },
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('❌ Get bookings failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== STARTUP ====================

(async () => {
  try {
    logger.info('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('✅ MongoDB connected');

    logger.info('🔌 Connecting to Redis...');
    const [host, port] = (process.env.REDIS_NODES || 'localhost:6379').split(':');
    
    const redisClient = redis.createClient({
      socket: { 
        host: host.trim(), 
        port: parseInt(port) 
      }
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    
    await redisClient.connect();
    logger.info('✅ Redis connected');

    lockService = new LockService(redisClient);
    bookingService = new BookingService(lockService);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('💥 Startup failed:', error);
    process.exit(1);
  }
})();

module.exports = app;