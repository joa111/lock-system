const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  remaining: { type: Number, required: true, min: 0 },
}, { _id: true, id: false });

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  sections: [sectionSchema],
  status: { type: String, enum: ['draft', 'live', 'completed'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

eventSchema.index({ status: 1, createdAt: -1 });

// Make sure sections array is properly serialized
eventSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
