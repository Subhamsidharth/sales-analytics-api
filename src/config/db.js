import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration object
const dbConfig = {
  uri: process.env.MONGODB_URI,
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  },
};

// Monitor mongoose connection events
const handleMongooseConnectionEvents = () => {
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
    logDBError(err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });
};

// Error logging function
const logDBError = (error) => {
  console.error('[Database Error]:', {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    code: error.code,
  });
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 5000; // 5 seconds

// Connect to MongoDB with retry mechanism
const connectWithRetry = async (retryCount = 0) => {
  try {
    await mongoose.connect(dbConfig.uri, dbConfig.options);
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying database connection... Attempt ${retryCount + 1}/${MAX_RETRIES}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      return connectWithRetry(retryCount + 1);
    }
    logDBError(err);
    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
  }
};

// Main connection function
const connectDB = async () => {
  try {
    // Set up mongoose debug mode if needed
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', false); // set true for debug
    }

    // Initialize connection event handlers
    handleMongooseConnectionEvents();

    // Connect to database with retry mechanism
    await connectWithRetry();

    return mongoose.connection;
  } catch (err) {
    console.error('❌ Fatal database connection error:', err);
    process.exit(1);
  }
};

export { connectDB as default, mongoose };
