const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

// ── Inline schemas (no import issues) ──────────────────
const supplierSchema = new mongoose.Schema({
  name: String, email: String, phone: String, address: String
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  category:     { type: String, required: true },
  subCategory:  { type: String },
  quantity:     { type: Number, default: 0 },
  price:        { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  description:  { type: String }
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);
const Product  = mongoose.model('Product',  productSchema);

// ── Helpers ─────────────────────────────────────────────
const toNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.abs(n);
};

const toInt = (val) => {
  const n = parseInt(val);
  return isNaN(n) ? 0 : Math.abs(n);
};

async function importData() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing products and suppliers
  await Product.deleteMany({});
  await Supplier.deleteMany({});
  console.log('Cleared existing products and suppliers');

  const rows = [];

  // Read all CSV rows first
  await new Promise((resolve, reject) => {
    fs.createReadStream('superstore-data.csv')
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim()
      }))
      .on('data', (row) => rows.push(row))
      .on('end',  resolve)
      .on('error', reject);
  });

  console.log(`Read ${rows.length} rows from CSV`);

  // ── Build unique suppliers from Customer Name (as vendor) ──
  const supplierNames = [...new Set(rows.map(r => (r['Customer Name'] || '').trim()).filter(Boolean))];
  const supplierMap   = {};

  console.log(`Creating ${supplierNames.length} suppliers...`);
  for (const name of supplierNames) {
    const sup = await Supplier.create({
      name,
      email:   name.toLowerCase().replace(/\s+/g, '.') + '@supplier.com',
      phone:   '',
      address: ''
    });
    supplierMap[name] = sup._id;
  }

  // ── Build unique products by Product Name ───────────────
  const productMap = {};
  for (const row of rows) {
    const name = (row['Product Name'] || '').trim();
    if (!name) continue;

    if (!productMap[name]) {
      productMap[name] = {
        name,
        category:    (row['Category']     || 'Uncategorized').trim(),
        subCategory: (row['Sub-Category'] || '').trim(),
        quantity:    0,
        totalSales:  0,
        price:       0,
        supplierName:(row['Customer Name'] || '').trim(),
        description: `${row['Category']} — ${row['Sub-Category']}`
      };
    }

    // Accumulate quantity and sales
    productMap[name].quantity   += toInt(row['Quantity']);
    productMap[name].totalSales += toNum(row['Sales']);
  }

  // ── Insert products ─────────────────────────────────────
  const productNames = Object.keys(productMap);
  console.log(`Creating ${productNames.length} unique products...`);

  let created = 0;
  for (const name of productNames) {
    const p = productMap[name];

    // Price = average sale per unit (Sales / Quantity)
    const avgPrice = p.quantity > 0
      ? parseFloat((p.totalSales / p.quantity).toFixed(2))
      : parseFloat(p.totalSales.toFixed(2));

    await Product.create({
      name:         p.name,
      category:     p.category,
      subCategory:  p.subCategory,
      quantity:     p.quantity,
      price:        avgPrice > 0 ? avgPrice : 1,
      reorderLevel: 10,
      supplier:     supplierMap[p.supplierName] || null,
      description:  p.description
    });
    created++;
  }

  console.log('');
  console.log('==========================================');
  console.log(` Import complete!`);
  console.log(` Products created : ${created}`);
  console.log(` Suppliers created: ${supplierNames.length}`);
  console.log('==========================================');

  await mongoose.disconnect();
}

importData().catch(err => {
  console.error('Import error:', err.message);
  process.exit(1);
});