import {userResolvers} from '../userResolvers';
import {User} from '../../../models/User';
import {Event} from '../../../models/Event';
import * as auth from '../../../utils/auth';
import { GraphQLError } from 'graphql';

// Mock the models and auth utilities
jest.mock('../../../models/User');
jest.mock('../../../models/Event');
jest.mock('../../../utils/auth');
jest.mock('../../../utils/pagination', () => ({
    paginateQuery: jest.fn().mockImplementation(async (query, model, filter, pagination) => {
        return {
            edges: [{id: '1', name: 'Test User'}],
            pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                currentPage: 1,
                totalPages: 1
            },
            totalCount: 1
        };
    })
}));

describe('User Resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Query', () => {
        describe('users', () => {
            it('should return paginated users', async () => {
                // Arrange
                const mockFind = jest.fn().mockReturnThis();
                (User.find as jest.Mock) = mockFind;

                // Act
                const result = await userResolvers.Query.users(null, {}, {} as any, {} as any);

                // Assert
                expect(result).toEqual({
                    edges: expect.any(Array),
                    pageInfo: expect.any(Object),
                    totalCount: expect.any(Number)
                });
            });

            it('should handle errors', async () => {
                // Arrange
                (User.find as jest.Mock).mockImplementation(() => {
                    throw new Error('Database error');
                });

                // Act & Assert
                await expect(userResolvers.Query.users(null, {}, {} as any, {} as any))
                    .rejects.toThrow('Error fetching users');
            });
        });

        describe('user', () => {
            it('should return a user by ID', async () => {
                // Arrange
                const mockUser = {id: '1', name: 'Test User'};
                const mockContext = {
                    loaders: {
                        userLoader: {
                            load: jest.fn().mockResolvedValue(mockUser)
                        }
                    }
                };

                // Act
                const result = await userResolvers.Query.user(null, {id: '1'}, mockContext as any, {} as any);

                // Assert
                expect(mockContext.loaders.userLoader.load).toHaveBeenCalledWith('1');
                expect(result).toEqual(mockUser);
            });

            it('should throw error if user not found', async () => {
                // Arrange
                const mockContext = {
                    loaders: {
                        userLoader: {
                            load: jest.fn().mockResolvedValue(null)
                        }
                    }
                };

                // Act & Assert
                await expect(userResolvers.Query.user(null, {id: '999'}, mockContext as any, {} as any))
                    .rejects.toThrow('User not found');
            });
        });

        describe('me', () => {
            it('should return the authenticated user', async () => {
                // Arrange
                const mockUser = {id: '1', name: 'Test User'};
                const mockContext = {
                    user: {id: '1', email: 'test@example.com'},
                    loaders: {
                        userLoader: {
                            load: jest.fn().mockResolvedValue(mockUser)
                        }
                    }
                };

                // Mock requireAuth to pass through the resolver
                (auth.requireAuth as jest.Mock).mockImplementation((resolver) => {
                    return resolver;
                });

                // Act
                const result = await userResolvers.Query.me(null, {}, mockContext as any, {} as any);

                // Assert
                expect(mockContext.loaders.userLoader.load).toHaveBeenCalledWith('1');
                expect(result).toEqual(mockUser);
            });
        });
    });

    describe('Mutation', () => {
        describe('createUser', () => {
            it('should create a new user and return auth data', async () => {
                // Arrange
                const userInput = {
                    name: 'New User',
                    email: 'new@example.com',
                    password: 'password123'
                };

                // Mock User.findOne to return null (user doesn't exist)
                (User.findOne as jest.Mock).mockResolvedValue(null);

                // Mock hashPassword
                (auth.hashPassword as jest.Mock).mockResolvedValue('hashed_password');

                // Mock User constructor and save
                const mockSave = jest.fn().mockResolvedValue({
                    id: '1',
                    email: userInput.email
                });
                (User as unknown as jest.Mock).mockImplementation(() => ({
                    save: mockSave
                }));

                // Mock generateToken
                (auth.generateToken as jest.Mock).mockReturnValue('token123');

                // Act
                const result = await userResolvers.Mutation.createUser(
                    null,
                    {userInput},
                    {} as any,
                    {} as any
                );

                // Assert
                expect(User.findOne).toHaveBeenCalledWith({email: userInput.email});
                expect(auth.hashPassword).toHaveBeenCalledWith(userInput.password);
                expect(User).toHaveBeenCalledWith({
                    name: userInput.name,
                    email: userInput.email,
                    password: 'hashed_password'
                });
                expect(mockSave).toHaveBeenCalled();
                expect(auth.generateToken).toHaveBeenCalledWith({
                    id: '1',
                    email: userInput.email
                });
                expect(result).toEqual({
                    userId: '1',
                    token: 'token123',
                    tokenExpiration: 1
                });
            });

            it('should throw error if user already exists', async () => {
                // Arrange
                const userInput = {
                    name: 'Existing User',
                    email: 'existing@example.com',
                    password: 'password123'
                };

                // Mock User.findOne to return an existing user
                (User.findOne as jest.Mock).mockResolvedValue({
                    id: '1',
                    email: userInput.email
                });

                // Act & Assert
                await expect(userResolvers.Mutation.createUser(
                    null,
                    {userInput},
                    {} as any,
                    {} as any
                )).rejects.toThrow(GraphQLError);
            });
        });

        describe('login', () => {
            it('should login a user and return auth data', async () => {
                // Arrange
                const loginInput = {
                    email: 'user@example.com',
                    password: 'password123'
                };

                // Mock User.findOne to return a user
                (User.findOne as jest.Mock).mockResolvedValue({
                    id: '1',
                    email: loginInput.email,
                    password: 'hashed_password'
                });

                // Mock verifyPassword
                (auth.verifyPassword as jest.Mock).mockResolvedValue(true);

                // Mock generateToken
                (auth.generateToken as jest.Mock).mockReturnValue('token123');

                // Act
                const result = await userResolvers.Mutation.login(
                    null,
                    loginInput,
                    {} as any,
                    {} as any
                );

                // Assert
                expect(User.findOne).toHaveBeenCalledWith({email: loginInput.email});
                expect(auth.verifyPassword).toHaveBeenCalledWith(
                    loginInput.password,
                    'hashed_password'
                );
                expect(auth.generateToken).toHaveBeenCalledWith({
                    id: '1',
                    email: loginInput.email
                });
                expect(result).toEqual({
                    userId: '1',
                    token: 'token123',
                    tokenExpiration: 1
                });
            });

            it('should throw error if user not found', async () => {
                // Arrange
                const loginInput = {
                    email: 'nonexistent@example.com',
                    password: 'password123'
                };

                await expect(userResolvers.Mutation.login(
                    null,
                    loginInput,
                    {} as any,
                    {} as any
                )).rejects.toThrow(GraphQLError);
            });

            it('should throw error if password is invalid', async () => {
                // Arrange
                const loginInput = {
                    email: 'user@example.com',
                    password: 'wrong_password'
                };

                // Mock User.findOne to return a user
                (User.findOne as jest.Mock).mockResolvedValue({
                    id: '1',
                    email: loginInput.email,
                    password: 'hashed_password'
                });

                // Mock verifyPassword to return false
                (auth.verifyPassword as jest.Mock).mockResolvedValue(false);

                // Act & Assert
                await expect(userResolvers.Mutation.login(
                    null,
                    loginInput,
                    {} as any,
                    {} as any
                )).rejects.toThrow(GraphQLError);
            });
        });
    });

    describe('User', () => {
        describe('events', () => {
            it('should return events created by the user', async () => {
                // Arrange
                const parent = {id: '1'};
                const mockEvents = [{id: '1', title: 'Event 1'}];
                const mockContext = {
                    loaders: {
                        userEventsLoader: {
                            load: jest.fn().mockResolvedValue(mockEvents)
                        }
                    }
                };

                // Act
                const result = await userResolvers.User.events(parent as any, {}, mockContext as any, {} as any);

                // Assert
                expect(mockContext.loaders.userEventsLoader.load).toHaveBeenCalledWith('1');
                expect(result).toEqual(mockEvents);
            });
        });

        describe('attendingEvents', () => {
            it('should return events the user is attending', async () => {
                // Arrange
                const parent = {id: '1'};
                const mockEvents = [{id: '1', title: 'Event 1'}];
                const mockContext = {
                    loaders: {
                        userAttendingEventsLoader: {
                            load: jest.fn().mockResolvedValue(mockEvents)
                        }
                    }
                };

                // Act
                const result = await userResolvers.User.attendingEvents(parent as any, {}, mockContext as any, {} as any);

                // Assert
                expect(mockContext.loaders.userAttendingEventsLoader.load).toHaveBeenCalledWith('1');
                expect(result).toEqual(mockEvents);
            });
        });
    });
});
