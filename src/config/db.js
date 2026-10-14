const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Mask credentials in log message
    const maskedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to MongoDB Atlas at ${maskedUri}...`);

    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true,
    });

    console.log(`MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
