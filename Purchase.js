const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  product:        { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  supplier:       { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  quantity:       { type: Number, required: true },
  costPrice:      { type: Number, required: true },
  purchaseDate:   { type: Date, default: Date.now },
  purchasedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);