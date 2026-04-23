const mongoose = require('mongoose');

// Normalize category: trim and title-case so "office supplies" == "Office Supplies"
function normalizeCategory(cat) {
  if (!cat) return 'Uncategorized';
  return cat.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

exports.getProducts = async (req, res) => {
  try {
    const products = await mongoose.connection.db
      .collection('products').find({}).toArray();
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getProduct = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    const product = await mongoose.connection.db
      .collection('products')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createProduct = async (req, res) => {
  try {
    const qty   = Math.max(0, parseInt(req.body.quantity)     || 0);
    const price = Math.max(0, parseFloat(req.body.price)      || 0);
    const ro    = Math.max(0, parseInt(req.body.reorderLevel) || 10);

    const product = {
      name:         (req.body.name || '').trim(),
      category:     normalizeCategory(req.body.category),
      subCategory:  (req.body.subCategory || '').trim(),
      quantity:     qty,
      price,
      reorderLevel: ro,
      description:  (req.body.description || '').trim(),
      ...(req.body.expiryDate ? { expiryDate: new Date(req.body.expiryDate) } : {}),
      createdAt:    new Date(),
      updatedAt:    new Date()
    };

    if (!product.name)     return res.status(400).json({ message: 'Product name is required' });
    if (!product.category) return res.status(400).json({ message: 'Category is required' });

    const result = await mongoose.connection.db
      .collection('products').insertOne(product);
    res.status(201).json({ ...product, _id: result.insertedId });
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.updateProduct = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    const qty   = Math.max(0, parseInt(req.body.quantity)     || 0);
    const price = Math.max(0, parseFloat(req.body.price)      || 0);
    const ro    = Math.max(0, parseInt(req.body.reorderLevel) || 10);

    const update = {
      name:         (req.body.name || '').trim(),
      category:     normalizeCategory(req.body.category),
      quantity:     qty,
      price,
      reorderLevel: ro,
      description:  (req.body.description || '').trim(),
      updatedAt:    new Date()
    };
    if (req.body.expiryDate) update.expiryDate = new Date(req.body.expiryDate);

    const result = await mongoose.connection.db
      .collection('products')
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: update },
        { returnDocument: 'after' }
      );
    if (!result) return res.status(404).json({ message: 'Product not found' });
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    await mongoose.connection.db
      .collection('products')
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getLowStock = async (req, res) => {
  try {
    const products = await mongoose.connection.db
      .collection('products')
      .find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } })
      .toArray();
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
