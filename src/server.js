import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import mongoose from 'mongoose';
import logger from './utils/logger.js';
import schema from './graphql/schema.js';
import connectDB from './config/db.js';
import config from './config/indexConfig.js';

async function startServer() {
  // Connect to database
  const dbConnection = await connectDB();

  // Create Express app and HTTP server
  const app = express();
  const httpServer = http.createServer(app);

  // Apply common middleware
  app.use(
    helmet({
      contentSecurityPolicy: config.env === 'production' ? undefined : false,
    })
  );
  app.use(cors());

  // Health check endpoint
  app.get('/health', (req, res) => {
    const dbStatus = dbConnection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({
      status: 'ok',
      db: dbStatus,
    });
  });

  // Create Apollo Server
  const server = new ApolloServer({
    ...schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError, error) => {
      logger.error('GraphQL Error:', {
        message: formattedError.message,
        path: formattedError.path,
      });

      return formattedError;
    },
    introspection: true,
  });

  // Start Apollo Server
  await server.start();

  // Apply Apollo middleware
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        db: mongoose.connection,
      }),
    })
  );

  // Start the server
  const PORT = config.port;
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
  logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);

  // Handle graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      await server.stop();
      await dbConnection.close();
      logger.info('Server stopped and DB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Start the server
startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
