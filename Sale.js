const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:     { type: Number, required: true },
  totalPrice:   { type: Number, required: true },
  saleDate:     { type: Date, default: Date.now },
  soldBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);