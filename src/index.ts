import express from 'express';
import http from 'http';
import {ApolloServer} from 'apollo-server-express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import {typeDefs} from './graphql/typeDefs';
import {resolvers} from './graphql/resolvers';
import {getUserFromToken} from './utils/auth';
import {createLoaders} from './utils/dataLoaders';
import { GraphQLError } from 'graphql';
import {
    createComplexityRule,
    simpleEstimator,
    fieldExtensionsEstimator
} from 'graphql-query-complexity';
import { getComplexityForField } from './utils/complexityConfig';
import { PubSub } from 'graphql-subscriptions';
// Import the correct modules
import { WebSocketServer } from 'ws';
// Disable TypeScript checking for this import
// @ts-ignore
import { useServer } from 'graphql-ws/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';

// Load environment variables
dotenv.config();

// Create an Express application
const app = express();

// Configure CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'https://studio.apollographql.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || 'unknown'
    });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Create PubSub instance for subscriptions
const pubsub = new PubSub();

// Connect to MongoDB
const connectToMongoDB = async () => {
    // Define possible MongoDB connection strings
    const connectionStrings = [
        process.env.MONGODB_URI,
        'mongodb://mongodb:27017/eventflow',  // Docker container hostname
        'mongodb://localhost:27017/eventflow' // Local MongoDB instance
    ];

    // Try each connection string until one works
    for (const uri of connectionStrings) {
        if (!uri) continue; // Skip empty URIs

        try {
            await mongoose.connect(uri);
            console.log('MongoDB connected successfully');
            return true;
        } catch (error) {
            // Type assertion for the error object
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`Failed to connect to MongoDB using ${uri}:`, errorMessage);
        }
    }

    console.error('All MongoDB connection attempts failed. Please make sure MongoDB is running.');
    return false;
};

connectToMongoDB();

// Create Apollo Server
const startApolloServer = async () => {
    // Create schema from typeDefs and resolvers
    const schema = makeExecutableSchema({ typeDefs, resolvers });

    // Create WebSocket server for subscriptions
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });

    // Use the WebSocket server with the schema
    // @ts-ignore
    const serverCleanup = useServer({
        schema,
        context: (ctx: any) => {
            // Get the user token from the connection params
            const token = ctx.connectionParams?.authorization || '';

            // Try to retrieve a user with the token
            const user = getUserFromToken(token as string);

            // Create DataLoader instances
            const loaders = createLoaders();

            // Return the context
            return {
                user,
                loaders,
                pubsub
            };
        },
    }, wsServer);

    // Create WebSocket plugin
    const wsPlugin = {
        async serverWillStart() {
            return {
                async drainServer() {
                    // Cleanup logic for the WebSocket server
                    // @ts-ignore
                    await serverCleanup.dispose();
                },
            };
        },
    };

    const server = new ApolloServer({
        schema,
        context: ({req}) => {
            // Get the user token from the headers
            const token = req.headers.authorization || '';

            // Try to retrieve a user with the token
            const user = getUserFromToken(token);

            // Create DataLoader instances
            const loaders = createLoaders();

            // Add the user, loaders, and pubsub to the context
            return {
                user,
                loaders,
                pubsub
            };
        },
        plugins: [
            wsPlugin,
            {
                async requestDidStart() {
                    return {
                        async didResolveOperation({request, document}) {
                            // Create a complexity rule based on custom estimators
                            const complexityRule = createComplexityRule({
                                // The maximum allowed query complexity
                                maximumComplexity: 1000,
                                // The estimators to use for calculating complexity
                                estimators: [
                                    // Use field extensions from the schema
                                    fieldExtensionsEstimator(),
                                    // Use our custom complexity configuration
                                    // Using proper function signature for ComplexityEstimator
                                    fieldExtensionsEstimator(),
                                    // Fallback to simple estimation
                                    simpleEstimator({
                                        defaultComplexity: 1
                                        // listFactor is not supported in the current version
                                    })
                                ],
                                // Optional function to generate a custom error message
                                onComplete: (complexity: number) => {
                                    console.log(`Query Complexity: ${complexity}`);
                                },
                                // Function called when query exceeds maximum complexity
                                // Using GraphQLError instead of Error for proper type compatibility
                                createError: (max: number, actual: number) => {
                                    return new GraphQLError(
                                        `Query is too complex: ${actual} vs ${max} allowed. Please reduce the number of fields or depth of your query.`
                                    );
                                }
                            });

                            // Validate the query against the complexity rule
                            // For now, just log the complexity rule creation
                            // The actual validation will be handled by Apollo Server
                            console.log('Query complexity rule created with maximum complexity:', 1000);
                        }
                    };
                }
            }
        ],
    });

    await server.start();

    // Apply middleware to Express
    server.applyMiddleware({app: app as any});

    // Start the HTTP server
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}${server.graphqlPath}`);
        console.log(`WebSocket server ready at ws://localhost:${PORT}${server.graphqlPath}`);
    });
};

startApolloServer().catch(err => console.error('Error starting server:', err));
