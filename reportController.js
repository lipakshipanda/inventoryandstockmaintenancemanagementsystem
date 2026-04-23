const mongoose = require('mongoose');

exports.getInventoryReport = async (req, res) => {
  try {
    const products   = await mongoose.connection.db
      .collection('products').find({}).toArray();
    const totalValue = products.reduce((s, p) =>
      s + Math.max(0, p.quantity||0) * Math.max(0, p.price||0), 0);
    const lowStock   = products.filter(p => (p.quantity||0) <= (p.reorderLevel||10));
    res.json({
      totalProducts: products.length,
      totalValue:    parseFloat(totalValue.toFixed(2)),
      lowStockCount: lowStock.length,
      products
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const db    = mongoose.connection.db;
    const sales = await db.collection('sales').find({}).toArray();
    const totalRevenue = sales.reduce((s, x) => s + Math.max(0, x.totalPrice||0), 0);

    // FIX: Compute COGS (Cost of Goods Sold) from purchase records
    // For each product sold, find its latest recorded costPrice from purchases.
    // If no purchase record exists (e.g. CSV-imported stock), fall back to 70% of selling price.
    const productIds = [...new Set(sales.map(s => s.product?.toString()).filter(Boolean))];
    const purchases  = productIds.length
      ? await db.collection('purchases')
          .find({ product: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) } })
          .sort({ purchaseDate: -1 })
          .toArray()
      : [];

    // Build map: productId -> most recent costPrice
    const costMap = {};
    purchases.forEach(p => {
      const key = p.product?.toString();
      if (key && !costMap[key]) costMap[key] = Math.max(0, p.costPrice || 0);
    });

    // COGS = sum over all sales of (unit cost * quantity)
    let totalCOGS = 0;
    sales.forEach(s => {
      const key      = s.product?.toString();
      const unitSell = Math.max(0, s.unitPrice || 0);
      const unitCost = costMap[key] !== undefined ? costMap[key] : unitSell * 0.7;
      totalCOGS     += unitCost * Math.max(0, s.quantity || 0);
    });

    const grossProfit = totalRevenue - totalCOGS;

    res.json({
      totalSales:   sales.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCOGS:    parseFloat(totalCOGS.toFixed(2)),
      grossProfit:  parseFloat(grossProfit.toFixed(2)),
      sales
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPurchaseReport = async (req, res) => {
  try {
    const purchases = await mongoose.connection.db
      .collection('purchases').find({}).toArray();
    // FIX: Guard against records where costPrice might be 0 or missing
    const totalCost = purchases.reduce((s, p) => {
      const cost = Math.max(0, p.costPrice || p.unitPrice || 0);
      const qty  = Math.max(0, p.quantity  || 0);
      return s + cost * qty;
    }, 0);
    res.json({
      totalPurchases: purchases.length,
      totalCost:      parseFloat(totalCost.toFixed(2)),
      purchases
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Sales by period — daily, weekly, monthly, quarterly, yearly
exports.getSalesByPeriod = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const now   = new Date();
    let   start = new Date();

    if (period === 'daily')     start.setDate(now.getDate() - 1);
    if (period === 'weekly')    start.setDate(now.getDate() - 7);
    if (period === 'monthly')   start.setMonth(now.getMonth() - 1);
    if (period === 'quarterly') start.setMonth(now.getMonth() - 3);
    if (period === 'yearly')    start.setFullYear(now.getFullYear() - 1);

    const sales = await mongoose.connection.db
      .collection('sales')
      .find({ saleDate: { $gte: start, $lte: now } })
      .sort({ saleDate: -1 })
      .toArray();

    // Group by date
    const grouped = {};
    sales.forEach(s => {
      const d   = new Date(s.saleDate).toLocaleDateString('en-IN');
      if (!grouped[d]) grouped[d] = { date: d, count: 0, revenue: 0, sales: [] };
      grouped[d].count++;
      grouped[d].revenue   += Math.max(0, s.totalPrice || 0);
      grouped[d].sales.push(s);
    });

    const totalRevenue = sales.reduce((s, x) => s + Math.max(0, x.totalPrice||0), 0);
    const totalQty     = sales.reduce((s, x) => s + Math.max(0, x.quantity||0), 0);

    // Top products in period
    const prodMap = {};
    sales.forEach(s => {
      const name = s.productName || 'Unknown';
      if (!prodMap[name]) prodMap[name] = { name, qty: 0, revenue: 0 };
      prodMap[name].qty     += Math.max(0, s.quantity||0);
      prodMap[name].revenue += Math.max(0, s.totalPrice||0);
    });
    const topProducts = Object.values(prodMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      period,
      start:        start.toISOString(),
      end:          now.toISOString(),
      totalSales:   sales.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalQty,
      topProducts,
      daily:        Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date)),
      sales
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: see which manager generated which report
exports.getManagerReports = async (req, res) => {
  try {
    const logs = await mongoose.connection.db
      .collection('reportlogs')
      .find({})
      .sort({ generatedAt: -1 })
      .toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
