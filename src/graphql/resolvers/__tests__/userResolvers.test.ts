import { GraphQLError } from 'graphql';

import { User } from '../../../models/User.js';
import type { IEvent } from '../../../models/Event.js';
import type { IUser } from '../../../models/User.js';
import type { Loaders } from '../../../utils/dataLoaders.js';
import * as auth from '../../../utils/auth.js';
import { userResolvers } from '../userResolvers.js';

jest.mock('../../../models/User');
jest.mock('../../../models/Event');
jest.doMock('../../../utils/auth', () => ({
  ...jest.requireActual('../../../utils/auth'),
  requireAuth: jest.fn(resolver => resolver),
}));
jest.mock('../../../utils/pagination', () => ({
  paginateQuery: jest.fn().mockImplementation(async () => {
    return {
      edges: [{ id: '1', name: 'Test User' }],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 1,
      },
      totalCount: 1,
    };
  }),
}));

type UserContext = Parameters<typeof userResolvers.Query.user>[2];
type LoadFn<T> = jest.MockedFunction<(key: string) => Promise<T>>;

type ContextWithMocks = UserContext & {
  mocks: {
    userLoaderLoad: LoadFn<IUser | null>;
    userEventsLoaderLoad: LoadFn<IEvent[]>;
    userAttendingEventsLoaderLoad: LoadFn<IEvent[]>;
  };
};

const createContext = (overrides: Partial<UserContext> = {}): ContextWithMocks => {
  const userLoaderLoad: LoadFn<IUser | null> = jest.fn();
  const userEventsLoaderLoad: LoadFn<IEvent[]> = jest.fn();
  const userAttendingEventsLoaderLoad: LoadFn<IEvent[]> = jest.fn();

  const loaders = {
    userLoader: { load: userLoaderLoad } as unknown as Loaders['userLoader'],
    eventLoader: { load: jest.fn() } as unknown as Loaders['eventLoader'],
    userEventsLoader: { load: userEventsLoaderLoad } as unknown as Loaders['userEventsLoader'],
    userAttendingEventsLoader: {
      load: userAttendingEventsLoaderLoad,
    } as unknown as Loaders['userAttendingEventsLoader'],
    eventAttendeesLoader: { load: jest.fn() } as unknown as Loaders['eventAttendeesLoader'],
  } as Loaders;

  return {
    loaders,
    ...overrides,
    mocks: {
      userLoaderLoad,
      userEventsLoaderLoad,
      userAttendingEventsLoaderLoad,
    },
  };
};

describe('User Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query', () => {
    describe('users', () => {
      it('should return paginated users', async () => {
        (User.find as jest.Mock) = jest.fn().mockReturnThis();

        const result = await userResolvers.Query.users(null, {});

        expect(result).toEqual({
          edges: expect.any(Array),
          pageInfo: expect.any(Object),
          totalCount: expect.any(Number),
        });
      });

      it('should handle errors', async () => {
        (User.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });

        await expect(userResolvers.Query.users(null, {})).rejects.toThrow('Error fetching users');
      });
    });

    describe('user', () => {
      it('should return a user by ID', async () => {
        // Arrange
        const mockUser = { id: '1', name: 'Test User' } as unknown as IUser;
        const mockContext = createContext();
        mockContext.mocks.userLoaderLoad.mockResolvedValue(mockUser);

        const result = await userResolvers.Query.user(null, { id: '1' }, mockContext);

        expect(mockContext.mocks.userLoaderLoad).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockUser);
      });

      it('should return null if user not found', async () => {
        const mockContext = createContext();
        mockContext.mocks.userLoaderLoad.mockResolvedValue(null);

        const result = await userResolvers.Query.user(null, { id: '999' }, mockContext);

        expect(result).toBeNull();
      });
    });

    describe('me', () => {
      it('should return the authenticated user', async () => {
        const mockUser = { id: '1', name: 'Test User' } as unknown as IUser;
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        mockContext.mocks.userLoaderLoad.mockResolvedValue(mockUser);

        const result = await userResolvers.Query.me(null, {}, mockContext, undefined);

        expect(mockContext.mocks.userLoaderLoad).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockUser);
      });

      it('should throw an error if the user loader fails', async () => {
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        mockContext.mocks.userLoaderLoad.mockRejectedValue(new Error('Loader error'));
        await expect(userResolvers.Query.me(null, {}, mockContext, undefined)).rejects.toThrow(
          'Error fetching user',
        );
      });
    });
  });

  describe('Mutation', () => {
    describe('createUser', () => {
      it('should create a new user and return auth data', async () => {
        const userInput = {
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        };

        (User.findOne as jest.Mock).mockResolvedValue(null);
        jest.spyOn(auth, 'hashPassword').mockResolvedValue('hashed_password');
        const mockSave = jest.fn().mockResolvedValue({
          _id: '1',
          email: userInput.email,
        });
        (User as unknown as jest.Mock).mockImplementation(() => ({
          save: mockSave,
        }));
        jest.spyOn(auth, 'generateToken').mockReturnValue('token123');

        const result = await userResolvers.Mutation.createUser(null, { userInput });

        expect(User.findOne).toHaveBeenCalledWith({ email: userInput.email });
        expect(auth.hashPassword).toHaveBeenCalledWith(userInput.password);
        expect(User).toHaveBeenCalledWith({
          name: userInput.name,
          email: userInput.email,
          password: 'hashed_password',
        });
        expect(mockSave).toHaveBeenCalled();
        expect(auth.generateToken).toHaveBeenCalledWith({
          id: '1',
          email: userInput.email,
        });
        expect(result).toEqual({
          userId: '1',
          token: 'token123',
          tokenExpiration: 1,
        });
      });

      it('should throw error if user already exists', async () => {
        const userInput = {
          name: 'Existing User',
          email: 'existing@example.com',
          password: 'password123',
        };

        (User.findOne as jest.Mock).mockResolvedValue({
          _id: '1',
          email: userInput.email,
        });

        await expect(userResolvers.Mutation.createUser(null, { userInput })).rejects.toThrow(
          GraphQLError,
        );
      });

      it('should throw an error if createUser fails', async () => {
        const userInput = {
          name: 'Test',
          email: 'test@test.com',
          password: 'password',
        };
        (User.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

        await expect(userResolvers.Mutation.createUser(null, { userInput })).rejects.toThrow(
          'Error creating user',
        );
      });
    });

    describe('login', () => {
      it('should login a user and return auth data', async () => {
        // Arrange
        const loginInput = {
          email: 'user@example.com',
          password: 'password123',
        };

        (User.findOne as jest.Mock).mockResolvedValue({
          _id: '1',
          email: loginInput.email,
          password: 'hashed_password',
        });
        jest.spyOn(auth, 'verifyPassword').mockResolvedValue(true);
        jest.spyOn(auth, 'generateToken').mockReturnValue('token123');

        // Act
        const result = await userResolvers.Mutation.login(null, loginInput);

        // Assert
        expect(User.findOne).toHaveBeenCalledWith({ email: loginInput.email });
        expect(auth.verifyPassword).toHaveBeenCalledWith(loginInput.password, 'hashed_password');
        expect(auth.generateToken).toHaveBeenCalledWith({
          id: '1',
          email: loginInput.email,
        });
        expect(result).toEqual({
          userId: '1',
          token: 'token123',
          tokenExpiration: 1,
        });
      });

      it('should throw error if user not found', async () => {
        const loginInput = {
          email: 'nonexistent@example.com',
          password: 'password123',
        };
        (User.findOne as jest.Mock).mockResolvedValue(null);
        await expect(userResolvers.Mutation.login(null, loginInput)).rejects.toThrow(GraphQLError);
      });

      it('should throw error if password is invalid', async () => {
        const loginInput = {
          email: 'user@example.com',
          password: 'wrong_password',
        };
        (User.findOne as jest.Mock).mockResolvedValue({
          _id: '1',
          email: loginInput.email,
          password: 'hashed_password',
        });
        jest.spyOn(auth, 'verifyPassword').mockResolvedValue(false);

        await expect(userResolvers.Mutation.login(null, loginInput)).rejects.toThrow(GraphQLError);
      });

      it('should throw an error if login fails', async () => {
        (User.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

        await expect(
          userResolvers.Mutation.login(null, { email: 'test@test.com', password: 'password' }),
        ).rejects.toThrow('Error logging in');
      });
    });

    describe('updateUser', () => {
      const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });

      it('should update a user name', async () => {
        const updateUserInput = { name: 'New Name' };
        const mockUpdatedUser = { _id: '1', name: 'New Name' };
        (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

        const result = (await userResolvers.Mutation.updateUser(
          null,
          { updateUserInput },
          mockContext,
          undefined,
        )) as { name?: string };

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          '1',
          { name: 'New Name' },
          { new: true },
        );
        expect(result.name).toBe('New Name');
      });

      it('should update a user password and hash it', async () => {
        const updateUserInput = { password: 'new_password' };
        jest.spyOn(auth, 'hashPassword').mockResolvedValue('hashed_new_password');
        (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: '1' });

        await userResolvers.Mutation.updateUser(null, { updateUserInput }, mockContext, undefined);

        expect(auth.hashPassword).toHaveBeenCalledWith('new_password');
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          '1',
          { password: 'hashed_new_password' },
          { new: true },
        );
      });

      it('should throw an error if user to update is not found', async () => {
        (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
        await expect(
          userResolvers.Mutation.updateUser(
            null,
            { updateUserInput: { name: 'test' } },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow('User not found');
      });

      it('should re-throw other errors', async () => {
        (User.findByIdAndUpdate as jest.Mock).mockRejectedValue(new Error('DB Error'));
        await expect(
          userResolvers.Mutation.updateUser(
            null,
            { updateUserInput: { name: 'test' } },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow('Error updating user');
      });
    });

    describe('deleteUser', () => {
      const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });

      it('should delete a user successfully', async () => {
        (User.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: '1' });
        const result = await userResolvers.Mutation.deleteUser(null, {}, mockContext, undefined);

        expect(User.findByIdAndDelete).toHaveBeenCalledWith('1');
        expect(result).toBe(true);
      });

      it('should throw an error if user to delete is not found', async () => {
        (User.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
        await expect(
          userResolvers.Mutation.deleteUser(null, {}, mockContext, undefined),
        ).rejects.toThrow('User not found');
      });

      it('should re-throw other errors', async () => {
        (User.findByIdAndDelete as jest.Mock).mockRejectedValue(new Error('DB Error'));
        await expect(
          userResolvers.Mutation.deleteUser(null, {}, mockContext, undefined),
        ).rejects.toThrow('Error deleting user');
      });
    });
  });

  describe('User field resolvers', () => {
    describe('events', () => {
      it('should load events for a user', async () => {
        const mockContext = createContext();
        mockContext.mocks.userEventsLoaderLoad.mockResolvedValue([]);
        const parent = { _id: '1' } as unknown as IUser;
        await userResolvers.User.events(parent, {}, mockContext);
        expect(mockContext.mocks.userEventsLoaderLoad).toHaveBeenCalledWith('1');
      });

      it('should handle errors', async () => {
        const mockContext = createContext();
        mockContext.mocks.userEventsLoaderLoad.mockRejectedValue(new Error());
        const parent = { _id: '1' } as unknown as IUser;
        await expect(userResolvers.User.events(parent, {}, mockContext)).rejects.toThrow(
          'Error fetching events',
        );
      });
    });

    describe('attendingEvents', () => {
      it('should load attending events for a user', async () => {
        const mockContext = createContext();
        mockContext.mocks.userAttendingEventsLoaderLoad.mockResolvedValue([]);
        const parent = { _id: '1' } as unknown as IUser;
        await userResolvers.User.attendingEvents(parent, {}, mockContext);
        expect(mockContext.mocks.userAttendingEventsLoaderLoad).toHaveBeenCalledWith('1');
      });

      it('should handle errors', async () => {
        const mockContext = createContext();
        mockContext.mocks.userAttendingEventsLoaderLoad.mockRejectedValue(new Error());
        const parent = { _id: '1' } as unknown as IUser;
        await expect(userResolvers.User.attendingEvents(parent, {}, mockContext)).rejects.toThrow(
          'Error fetching attending events',
        );
      });
    });
  });
});
