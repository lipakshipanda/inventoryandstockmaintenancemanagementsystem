const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  category:     { type: String, required: true },
  subCategory:  { type: String },
  quantity:     { type: Number, default: 0 },
  price:        { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  expiryDate:   { type: Date },
  description:  { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);