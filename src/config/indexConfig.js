import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 7008,

  // Logging config
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
