require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');

  // Remove supplier field from all products
  const result = await mongoose.connection.db
    .collection('products')
    .updateMany({}, { $unset: { supplier: '' } });

  console.log('Products fixed:', result.modifiedCount);

  // Verify fix
  const sample = await mongoose.connection.db
    .collection('products')
    .findOne({});
  console.log('Sample product (no supplier field expected):');
  console.log('  name:', sample.name);
  console.log('  supplier field:', sample.supplier);

  process.exit();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});