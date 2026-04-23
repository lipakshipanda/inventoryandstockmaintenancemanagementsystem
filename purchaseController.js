const mongoose = require('mongoose');

exports.getPurchases = async (req, res) => {
  try {
    const purchases = await mongoose.connection.db
      .collection('purchases').find({}).sort({ purchaseDate: -1 }).toArray();
    res.json(purchases);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createPurchase = async (req, res) => {
  const { product, quantity, costPrice, supplierName, purchasedByName } = req.body;
  try {
    const qty   = Math.max(1, parseInt(quantity)     || 1);
    const cost  = Math.max(0, parseFloat(costPrice)  || 0);

    if (!product)  return res.status(400).json({ message: 'Product is required' });
    if (qty < 1)   return res.status(400).json({ message: 'Quantity must be at least 1' });
    if (cost < 0)  return res.status(400).json({ message: 'Cost price cannot be negative' });

    const { ObjectId } = mongoose.Types;
    const db = mongoose.connection.db;

    const prod = await db.collection('products')
      .findOne({ _id: new ObjectId(product) });
    if (!prod) return res.status(404).json({ message: 'Product not found' });

    // Increase stock correctly
    const newQty = Math.max(0, (prod.quantity || 0) + qty);
    await db.collection('products').updateOne(
      { _id: new ObjectId(product) },
      { $set: { quantity: newQty, updatedAt: new Date() } }
    );

    const purchase = {
      product:         new ObjectId(product),
      productName:     prod.name,
      quantity:        qty,
      costPrice:       cost,
      supplierName:    supplierName  || 'Unknown',
      purchasedByName: purchasedByName || req.user?.name || 'Unknown',
      purchasedBy:     req.user?._id ? new ObjectId(String(req.user._id)) : null,
      purchaseDate:    new Date(),
      createdAt:       new Date(),
      updatedAt:       new Date()
    };

    const result = await db.collection('purchases').insertOne(purchase);
    res.status(201).json({ ...purchase, _id: result.insertedId });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ message: err.message });
  }
};
