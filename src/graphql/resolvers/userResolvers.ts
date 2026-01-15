import { GraphQLError } from 'graphql';

import type { IUser } from '../../models/User.js';
import { User } from '../../models/User.js';
import { generateToken, hashPassword, verifyPassword, requireAuth } from '../../utils/auth.js';
import type { Loaders } from '../../utils/dataLoaders.js';
import { paginateQuery } from '../../utils/pagination.js';

interface UserInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface PaginationInput {
  page?: number;
  limit?: number;
}

interface UserConnection {
  edges: IUser[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    currentPage: number;
    totalPages: number;
  };
  totalCount: number;
}

interface AuthData {
  userId: string;
  token: string;
  tokenExpiration: number;
}

interface Context {
  user?: {
    id: string;
    email: string;
  };
  loaders: Loaders;
}

export const userResolvers = {
  Query: {
    users: async (
      _: unknown,
      { pagination }: { pagination?: PaginationInput },
    ): Promise<UserConnection> => {
      try {
        const query = User.find();
        return await paginateQuery(query, User, {}, pagination);
      } catch (_err) {
        throw new Error('Error fetching users');
      }
    },
    user: async (
      _: unknown,
      { id }: { id: string },
      { loaders }: Context,
    ): Promise<IUser | null> => {
      try {
        const user = await loaders.userLoader.load(id);
        if (!user) {
          throw new Error('User not found');
        }
        return user;
      } catch (_err) {
        throw new Error('User not found');
      }
    },
    me: requireAuth(async (_: unknown, __: unknown, { user, loaders }: Context): Promise<IUser> => {
      try {
        const userData = await loaders.userLoader.load(user!.id);
        if (!userData) {
          throw new Error('User not found');
        }
        return userData;
      } catch (_err) {
        throw new Error('User not found');
      }
    }),
  },
  Mutation: {
    createUser: async (_: unknown, { userInput }: { userInput: UserInput }): Promise<AuthData> => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userInput.email });
        if (existingUser) {
          throw new GraphQLError('User already exists', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        // Hash password
        const hashedPassword = await hashPassword(userInput.password);

        // Create new user
        const user = new User({
          name: userInput.name,
          email: userInput.email,
          password: hashedPassword,
        });

        // Save user to database
        const result = await user.save();

        // Generate token
        const token = generateToken({ id: result._id.toString(), email: result.email });

        return {
          userId: result._id.toString(),
          token,
          tokenExpiration: 1, // 1 day
        };
      } catch (err) {
        throw err;
      }
    },
    login: async (_: unknown, { email, password }: LoginInput): Promise<AuthData> => {
      try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          throw new GraphQLError('Invalid credentials', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          throw new GraphQLError('Invalid credentials', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }

        // Generate token
        const token = generateToken({ id: user._id.toString(), email: user.email });

        return {
          userId: user._id.toString(),
          token,
          tokenExpiration: 1, // 1 day
        };
      } catch (err) {
        throw err;
      }
    },
  },
  User: {
    events: async (parent: IUser, _: unknown, { loaders }: Context): Promise<unknown> => {
      try {
        return await loaders.userEventsLoader.load(parent._id.toString());
      } catch (_err) {
        throw new Error('Error fetching events');
      }
    },
    attendingEvents: async (parent: IUser, _: unknown, { loaders }: Context): Promise<unknown> => {
      try {
        return await loaders.userAttendingEventsLoader.load(parent._id.toString());
      } catch (_err) {
        throw new Error('Error fetching attending events');
      }
    },
  },
};
