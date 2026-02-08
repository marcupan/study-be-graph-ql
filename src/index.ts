import http from 'http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import express from 'express';
import {
  createComplexityRule,
  fieldExtensionsEstimator,
  simpleEstimator,
} from 'graphql-query-complexity';
import { PubSub } from 'graphql-subscriptions';
import { useServer } from 'graphql-ws/use/ws';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { WebSocketServer } from 'ws';

import { config } from './config.js';
import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/typeDefs.js';
import { logger } from './logger.js';
import { LruKeyValueCache } from './utils/apolloCache.js';
import { getUserFromToken } from './utils/auth.js';
import { createLoaders } from './utils/dataLoaders.js';

mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

const app = express();
const httpServer = http.createServer(app);
let apolloServer: ApolloServer | null = null;
let serverCleanup: ReturnType<typeof useServer> | null = null;

app.disable('x-powered-by');

app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  }),
);

app.use(express.json({ limit: config.http.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.http.bodyLimit }));

app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: config.env,
  });
});

const startServer = async () => {
  if (config.env !== 'test') {
    try {
      await mongoose.connect(config.mongoose.url);
      logger.info('MongoDB connected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to connect to MongoDB: ${errorMessage}`);
      process.exit(1);
    }
  }

  const pubsub = new PubSub();
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  serverCleanup = useServer(
    {
      schema,
      context: async ctx => {
        const connectionParams = ctx.connectionParams ?? {};
        const token =
          (typeof connectionParams['authorization'] === 'string' &&
            connectionParams['authorization']) ||
          (typeof connectionParams['Authorization'] === 'string' &&
            connectionParams['Authorization']) ||
          '';
        const user = getUserFromToken(token);
        const loaders = createLoaders();
        return { pubsub, user, loaders };
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
              await serverCleanup?.dispose();
            },
          };
        },
      },
    ],
    introspection: config.env !== 'production',
    formatError: (formattedError, error) => {
      if (config.env !== 'production') {
        logger.error(error);
      }
      return formattedError;
    },
    persistedQueries: {
      cache: new LruKeyValueCache(),
    },
    validationRules: [
      createComplexityRule({
        estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
        maximumComplexity: 1000,
        onComplete: (complexity: number) => {
          logger.info(`Query Complexity: ${complexity}`);
        },
      }),
    ],
  });

  await server.start();
  apolloServer = server;

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = (req.headers?.['authorization'] as string) ?? '';
        const user = getUserFromToken(token);
        const loaders = createLoaders();
        return { req, user, loaders, pubsub };
      },
    }),
  );

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,

      _next: express.NextFunction,
    ) => {
      logger.error(err);
      res.status(500).send('Something went wrong');
    },
  );

  httpServer.listen(config.port, () => {
    logger.info(`🚀 Server ready at http://localhost:${config.port}/graphql`);
    logger.info(`🚀 Subscriptions ready at ws://localhost:${config.port}/graphql`);
  });
};

const shutdown = async (signal?: string) => {
  try {
    logger.info(
      signal ? `Received ${signal}. Shutting down gracefully...` : 'Shutting down gracefully...',
    );
    await apolloServer?.stop();
    await serverCleanup?.dispose();
    if (config.env !== 'test') {
      await mongoose.disconnect();
    }
    await new Promise<void>((resolve, reject) => {
      httpServer.close(err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
};

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    void shutdown(signal);
  });
});

startServer().catch(err => {
  logger.error({ err }, 'Error starting server');
});
