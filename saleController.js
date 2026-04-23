const mongoose = require('mongoose');

exports.getSales = async (req, res) => {
  try {
    const db    = mongoose.connection.db;
    const sales = await db.collection('sales').find({}).sort({ saleDate: -1 }).toArray();

    const productIds = [...new Set(sales.map(s => s.product?.toString()).filter(Boolean))];
    const products   = productIds.length
      ? await db.collection('products')
          .find({ _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) } })
          .toArray()
      : [];
    const productMap = {};
    products.forEach(p => { productMap[String(p._id)] = p; });

    const enriched = sales.map(s => ({
      ...s,
      product: productMap[String(s.product)] || { name: s.productName || '—', price: 0 },
      soldBy:  { name: s.soldByName || '—' }
    }));
    res.json(enriched);
  } catch (err) {
    console.error('getSales error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.createSale = async (req, res) => {
  // Admin, manager, and staff can all record sales
  const { product, quantity } = req.body;
  const qty = parseInt(quantity);
  if (!qty || qty < 1) return res.status(400).json({ message: 'Quantity must be at least 1' });

  try {
    const db = mongoose.connection.db;
    const { ObjectId } = mongoose.Types;

    const prod = await db.collection('products').findOne({ _id: new ObjectId(product) });
    if (!prod) return res.status(404).json({ message: 'Product not found' });

    const available = prod.quantity || 0;
    if (available < qty) {
      return res.status(400).json({ message: `Insufficient stock. Available: ${available}, Requested: ${qty}` });
    }

    const unitPrice  = Math.max(0, prod.price || 0);
    const totalPrice = parseFloat((unitPrice * qty).toFixed(2));
    const newQty     = Math.max(0, available - qty);

    await db.collection('products').updateOne(
      { _id: new ObjectId(product) },
      { $set: { quantity: newQty, updatedAt: new Date() } }
    );

    const sale = {
      product:     new ObjectId(product),
      productName: prod.name,
      category:    prod.category || '',
      quantity:    qty,
      unitPrice,
      totalPrice,
      saleDate:    new Date(),
      soldBy:      req.user?._id ? new ObjectId(String(req.user._id)) : null,
      soldByName:  req.user?.name  || 'Unknown',
      soldByRole:  req.user?.role  || 'unknown',
      createdAt:   new Date(),
      updatedAt:   new Date()
    };

    const result = await db.collection('sales').insertOne(sale);
    res.status(201).json({ ...sale, _id: result.insertedId });
  } catch (err) {
    console.error('createSale error:', err);
    res.status(500).json({ message: err.message });
  }
};
