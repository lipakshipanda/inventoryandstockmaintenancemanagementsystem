const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  const existing = await users.findOne({ email: 'admin@example.com' });
  if (existing) {
    console.log('User already exists! Login with admin@example.com / admin123');
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await users.insertOne({
    name: 'Admin User',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('');
  console.log('==================================');
  console.log(' Admin created successfully!');
  console.log(' Email:    admin@example.com');
  console.log(' Password: admin123');
  console.log('==================================');
  await mongoose.disconnect();
}

createAdmin().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});