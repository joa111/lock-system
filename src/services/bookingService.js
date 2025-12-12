const Event = require('../models/Event');
const Booking = require('../models/Booking');
const logger = require('../config/logger');

class BookingService {
  constructor(lockService) {
    this.lockService = lockService;
  }

  async createBooking(eventId, sectionId, qty, userId) {
    return await this.lockService.withLock(eventId, sectionId, async (lockData) => {
      const session = await Event.startSession();
      try {
        session.startTransaction({
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        });

        const event = await Event.findById(eventId).session(session);
        if (!event) throw new Error('Event not found');

        const section = event.sections.id(sectionId);
        if (!section) throw new Error('Section not found');

        if (section.remaining < qty) {
          throw new Error(`Only ${section.remaining} seats available`);
        }

        section.remaining -= qty;
        await event.save({ session });

        const booking = new Booking({
          eventId,
          sectionId,
          qty,
          userId,
          totalPrice: section.price * qty,
          lockId: lockData.lockId,
        });

        await booking.save({ session });
        await session.commitTransaction();

        logger.info(`✅ Booking confirmed: ${booking._id}`);
        return {
          success: true,
          booking,
          lockAcquisitionTime: lockData.acquisitionTime,
        };
      } catch (error) {
        await session.abortTransaction();
        logger.error(`❌ Transaction aborted: ${error.message}`);
        throw error;
      } finally {
        await session.endSession();
      }
    });
  }

  async getBookings(filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = { status: filters.status || 'confirmed' };
    if (filters.eventId) query.eventId = filters.eventId;
    if (filters.userId) query.userId = filters.userId;

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(query);
    return {
      bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  validateBookingRequest(eventId, sectionId, qty, userId) {
    if (!eventId || !sectionId) throw new Error('Missing eventId or sectionId');
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100) throw new Error('Invalid quantity');
    if (!userId) throw new Error('Missing userId');
  }
}

module.exports = BookingService;
