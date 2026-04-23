const express   = require('express');
const dotenv    = require('dotenv');
const cors      = require('cors');
const path      = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/products',  require('./routes/productRoutes'));
app.use('/api/sales',     require('./routes/saleRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/reports',   require('./routes/reportRoutes'));
app.use('/api/users',     require('./routes/userRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));