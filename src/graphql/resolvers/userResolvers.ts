import { GraphQLError } from 'graphql';

import { logger } from '../../logger.js';
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

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
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
      } catch (err) {
        logger.error(err);
        throw new GraphQLError('Error fetching users', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    user: async (
      _: unknown,
      { id }: { id: string },
      { loaders }: Context,
    ): Promise<IUser | null> => {
      try {
        return await loaders.userLoader.load(id);
      } catch (err) {
        logger.error(err);
        throw new GraphQLError('Error fetching user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    me: requireAuth(async (_: unknown, __: unknown, { user, loaders }: Context): Promise<IUser> => {
      try {
        const userData = await loaders.userLoader.load(user!.id);
        if (!userData) {
          throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
        }
        return userData;
      } catch (err) {
        logger.error(err);
        throw new GraphQLError('Error fetching user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    }),
  },
  Mutation: {
    createUser: async (_: unknown, { userInput }: { userInput: UserInput }): Promise<AuthData> => {
      try {
        const existingUser = await User.findOne({ email: userInput.email });
        if (existingUser) {
          throw new GraphQLError('User already exists', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const hashedPassword = await hashPassword(userInput.password);

        const user = new User({
          name: userInput.name,
          email: userInput.email,
          password: hashedPassword,
        });

        const result = await user.save();

        const token = generateToken({ id: result._id.toString(), email: result.email });

        return {
          userId: result._id.toString(),
          token,
          tokenExpiration: 1,
        };
      } catch (err) {
        logger.error(err);
        if (err instanceof GraphQLError) {
          throw err;
        }
        throw new GraphQLError('Error creating user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    login: async (_: unknown, { email, password }: LoginInput): Promise<AuthData> => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          throw new GraphQLError('Invalid credentials', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          throw new GraphQLError('Invalid credentials', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }

        const token = generateToken({ id: user._id.toString(), email: user.email });

        return {
          userId: user._id.toString(),
          token,
          tokenExpiration: 1,
        };
      } catch (err) {
        logger.error(err);
        if (err instanceof GraphQLError) {
          throw err;
        }
        throw new GraphQLError('Error logging in', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    updateUser: requireAuth(
      async (
        _: unknown,
        { updateUserInput }: { updateUserInput: UpdateUserInput },
        { user }: Context,
      ) => {
        try {
          const { name, email, password } = updateUserInput;
          const updateData: UpdateUserInput = {};

          if (name) updateData.name = name;
          if (email) updateData.email = email;
          if (password) {
            updateData.password = await hashPassword(password);
          }

          const updatedUser = await User.findByIdAndUpdate(user!.id, updateData, { new: true });

          if (!updatedUser) {
            throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
          }

          return updatedUser;
        } catch (err) {
          logger.error(err);
          if (err instanceof GraphQLError) {
            throw err;
          }
          throw new GraphQLError('Error updating user', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
        }
      },
    ),
    deleteUser: requireAuth(async (_: unknown, __: unknown, { user }: Context) => {
      try {
        const deletedUser = await User.findByIdAndDelete(user!.id);

        if (!deletedUser) {
          throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
        }

        return true;
      } catch (err) {
        logger.error(err);
        if (err instanceof GraphQLError) {
          throw err;
        }
        throw new GraphQLError('Error deleting user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    }),
  },
  User: {
    events: async (parent: IUser, _: unknown, { loaders }: Context) => {
      try {
        return await loaders.userEventsLoader.load(parent._id.toString());
      } catch (err) {
        logger.error(err);
        throw new GraphQLError('Error fetching events', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    attendingEvents: async (parent: IUser, _: unknown, { loaders }: Context) => {
      try {
        return await loaders.userAttendingEventsLoader.load(parent._id.toString());
      } catch (err) {
        logger.error(err);
        throw new GraphQLError('Error fetching attending events', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};
