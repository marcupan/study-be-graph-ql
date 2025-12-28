import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { resolvers } from '../../graphql/resolvers.js';
import { typeDefs } from '../../graphql/typeDefs.js';
import { Event } from '../../models/Event.js';
import { User } from '../../models/User.js';
import { generateToken, getUserFromToken } from '../../utils/auth.js';
import { createLoaders } from '../../utils/dataLoaders.js';

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
export const createTestUser = async (
  userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  },
): Promise<{ user: any; token: string }> => {
  const user = new User(userData);
  const savedUser = await user.save();
  const token = generateToken({ id: savedUser._id.toString(), email: savedUser.email });
  return { user: savedUser, token };
};

// Create a test event
export const createTestEvent = async (
  creatorId: string,
  eventData = {
    title: 'Test Event',
    description: 'This is a test event',
    date: new Date('2023-01-01'),
    time: '14:00',
    location: 'Test Location',
  },
): Promise<any> => {
  const event = new Event({
    ...eventData,
    creator: creatorId,
    attendees: [],
  });
  return await event.save();
};

// Create a test Apollo Server
export const createTestServer = (): ApolloServer => {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  return new ApolloServer({
    schema,
  });
};

// Execute a GraphQL query
// Execute a GraphQL query
export const executeOperation = async (
  server: ApolloServer,
  operation: { query: string; variables?: any },
  token?: string,
  baseContext: Record<string, unknown> = {},
): Promise<any> => {
  const pubsub = new PubSub();
  const loaders = createLoaders();
  const user = token ? getUserFromToken(token) : null;

  const response = await server.executeOperation(operation, {
    contextValue: {
      ...baseContext,
      loaders,
      pubsub,
      token: token ? `Bearer ${token}` : '',
      user,
    },
  });
  console.log(response);

  if (response.body.kind === 'single') {
    return {
      data: response.body.singleResult.data,
      errors: response.body.singleResult.errors,
    };
  }

  return response;
};

// Helper function to execute a GraphQL query with authentication
export const executeAuthenticatedOperation = async (
  server: ApolloServer,
  operation: { query: string; variables?: any },
  token: string,
): Promise<any> => {
  return executeOperation(server, operation, token);
};

describe('Test Server Utilities', () => {
  it('should have at least one test', () => {
    expect(true).toBe(true);
  });
});

export const mockRequireAuth = () => {
  const auth = require('../../utils/auth');
  (auth.requireAuth as jest.Mock) = jest
    .fn()
    .mockImplementation((resolver: (parent: any, args: any, context: any, info: any) => any) => {
      return (parent: any, args: any, context: any, info: any) =>
        resolver(parent, args, context, info);
    });
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
  `,
};
