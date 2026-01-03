import http from 'http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { PubSub } from 'graphql-subscriptions';
import type { Context } from 'graphql-ws';
import { useServer } from 'graphql-ws/use/ws';
import mongoose from 'mongoose';
import { WebSocketServer } from 'ws';

import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/typeDefs.js';
import { getUserFromToken } from './utils/auth.js';
import { createLoaders } from './utils/dataLoaders.js';

// Load environment variables
dotenv.config();

if (!process.env['JWT_SECRET']) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

// Create an Express application
const app = express();

// Add health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env['npm_package_version'] ?? 'unknown',
  });
});

// Create an HTTP server
const httpServer = http.createServer(app);

// Create PubSub instance for subscriptions
const pubsub = new PubSub();

// Connect to MongoDB
const connectToMongoDB = async () => {
  // Define possible MongoDB connection strings
  const connectionStrings = [
    process.env['MONGODB_URI'],
    'mongodb://mongodb:27017/eventflow', // Docker container hostname
    'mongodb://localhost:27017/eventflow', // Local MongoDB instance
  ];

  // Try each connection string until one works
  for (const uri of connectionStrings) {
    if (!uri) continue; // Skip empty URIs

    try {
      await mongoose.connect(uri);
      console.error('MongoDB connected successfully');
      return true;
    } catch (error) {
      // Type assertion for the error object
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to connect to MongoDB using ${uri}:`, errorMessage);
    }
  }

  console.error('All MongoDB connection attempts failed. Please make sure MongoDB is running.');
  return false;
};

if (process.env['NODE_ENV'] !== 'test') {
  void connectToMongoDB();
}

// Create Apollo Server
const startApolloServer = async () => {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async (_ctx: Context) => {
        // This is the context for the subscription connections
        return { pubsub };
      },
    },
    wsServer,
  );

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    // validationRules: [
    //     createComplexityRule({
    //         estimators: [
    //             fieldExtensionsEstimator(),
    //             simpleEstimator({defaultComplexity: 1}),
    //         ],
    //         maximumComplexity: 1000,
    //         onComplete: (complexity: number) => {
    //             console.log('Query Complexity:', complexity);
    //         },
    //     }),
    // ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }: { req: { headers?: Record<string, unknown> } }) => {
        const token = (req.headers?.['authorization'] as string) ?? '';
        const user = getUserFromToken(token);
        const loaders = createLoaders();
        return { req, user, loaders, pubsub };
      },
    }),
  );

  const PORT = process.env['PORT'] ?? 4000;
  httpServer.listen(PORT, () => {
    console.error(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.error(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`);
  });
};

startApolloServer().catch(err => console.error('Error starting server:', err));
