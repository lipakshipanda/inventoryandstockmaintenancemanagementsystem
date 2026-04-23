require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

async function importSales() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing sales
  await mongoose.connection.db.collection('sales').deleteMany({});
  console.log('Cleared existing sales');

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream('superstore-data.csv')
      .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
      .on('data', row => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Read ${rows.length} rows`);

  // Get all products from DB
  const products = await mongoose.connection.db
    .collection('products').find({}).toArray();

  // Map product name to _id
  const productMap = {};
  products.forEach(p => { productMap[p.name] = p._id; });

  // Get admin user
  const admin = await mongoose.connection.db
    .collection('users').findOne({ role: 'admin' });

  let created = 0;
  let skipped = 0;
  const sales = [];

  for (const row of rows) {
    const productName = (row['Product Name'] || '').trim();
    const productId   = productMap[productName];

    if (!productId) { skipped++; continue; }

    const quantity   = Math.abs(parseInt(row['Quantity'])  || 1);
    const totalPrice = Math.abs(parseFloat(row['Sales'])   || 0);
    const orderDate  = new Date(row['Order Date'] || Date.now());

    sales.push({
      product:    productId,
      quantity,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      saleDate:   orderDate,
      soldBy:     admin?._id || null,
      createdAt:  orderDate,
      updatedAt:  orderDate
    });
    created++;
  }

  // Insert in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < sales.length; i += batchSize) {
    const batch = sales.slice(i, i + batchSize);
    await mongoose.connection.db.collection('sales').insertMany(batch);
    console.log(`Inserted ${Math.min(i + batchSize, sales.length)} / ${sales.length}`);
  }

  console.log('');
  console.log('==========================================');
  console.log(` Sales import complete!`);
  console.log(` Sales created : ${created}`);
  console.log(` Skipped       : ${skipped}`);
  console.log('==========================================');

  await mongoose.disconnect();
}

importSales().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});