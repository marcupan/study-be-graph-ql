import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from '../../graphql/typeDefs';
import { resolvers } from '../../graphql/resolvers';
import { createLoaders } from '../../utils/dataLoaders';
import { PubSub } from 'graphql-subscriptions';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../models/User';
import { Event } from '../../models/Event';
import { generateToken } from '../../utils/auth';

// Create a test database
let mongoServer: MongoMemoryServer;

// Initialize the database
export const initializeDatabase = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

// Close the database connection
export const closeDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

// Clear the database between tests
export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Create a test user and return the user and token
export const createTestUser = async (userData = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
}): Promise<{ user: any; token: string }> => {
  const user = new User(userData);
  const savedUser = await user.save();
  const token = generateToken({ id: savedUser.id, email: savedUser.email });
  return { user: savedUser, token };
};

// Create a test event
export const createTestEvent = async (creatorId: string, eventData = {
  title: 'Test Event',
  description: 'This is a test event',
  date: new Date('2023-01-01'),
  time: '14:00',
  location: 'Test Location'
}): Promise<any> => {
  const event = new Event({
    ...eventData,
    creator: creatorId,
    attendees: []
  });
  return await event.save();
};

// Create a test Apollo Server
export const createTestServer = (context = {}): ApolloServer => {
  // Create schema from typeDefs and resolvers
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create PubSub instance for subscriptions
  const pubsub = new PubSub();

  // Create DataLoader instances
  const loaders = createLoaders();

  // Create Apollo Server
  return new ApolloServer({
    schema,
    context: ({ req }) => {
      // Get the user token from the headers
      const token = req?.headers?.authorization || '';

      // Return the context with loaders, pubsub, and any additional context
      return {
        ...context,
        loaders,
        pubsub
      };
    }
  });
};

// Execute a GraphQL query
export const executeOperation = async (
  server: ApolloServer,
  operation: { query: string; variables?: any },
  token?: string
): Promise<any> => {
  const response = await server.executeOperation(operation, {
    req: {
      headers: {
        authorization: token ? `Bearer ${token}` : ''
      }
    }
  });

  return response;
};

// Helper function to execute a GraphQL query with authentication
export const executeAuthenticatedOperation = async (
  server: ApolloServer,
  operation: { query: string; variables?: any },
  token: string
): Promise<any> => {
  return executeOperation(server, operation, token);
};

// Common GraphQL operations
export const operations = {
  // User operations
  registerUser: `
    mutation RegisterUser($userInput: UserInput!) {
      createUser(userInput: $userInput) {
        userId
        token
        tokenExpiration
      }
    }
  `,
  login: `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        userId
        token
        tokenExpiration
      }
    }
  `,
  getUser: `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
        createdAt
        updatedAt
      }
    }
  `,
  getMe: `
    query GetMe {
      me {
        id
        name
        email
        createdAt
        updatedAt
      }
    }
  `,

  // Event operations
  createEvent: `
    mutation CreateEvent($eventInput: EventInput!) {
      createEvent(eventInput: $eventInput) {
        id
        title
        description
        date
        time
        location
        imageUrl
        creator {
          id
          name
        }
        attendees {
          id
          name
        }
        createdAt
        updatedAt
      }
    }
  `,
  getEvent: `
    query GetEvent($id: ID!) {
      event(id: $id) {
        id
        title
        description
        date
        time
        location
        imageUrl
        creator {
          id
          name
        }
        attendees {
          id
          name
        }
        createdAt
        updatedAt
      }
    }
  `,
  getEvents: `
    query GetEvents($pagination: PaginationInput) {
      events(pagination: $pagination) {
        edges {
          id
          title
          description
          date
          time
          location
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          currentPage
          totalPages
        }
        totalCount
      }
    }
  `,
  attendEvent: `
    mutation AttendEvent($eventId: ID!) {
      attendEvent(eventId: $eventId) {
        id
        title
        attendees {
          id
          name
        }
      }
    }
  `,
  cancelAttendance: `
    mutation CancelAttendance($eventId: ID!) {
      cancelAttendance(eventId: $eventId) {
        id
        title
        attendees {
          id
          name
        }
      }
    }
  `
};
