const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  qty: { type: Number, required: true, min: 1, max: 100 },
  userId: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['confirmed', 'pending', 'cancelled'], default: 'confirmed' },
  lockId: String,
}, { timestamps: true });

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ eventId: 1, sectionId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
