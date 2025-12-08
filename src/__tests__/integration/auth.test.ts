import {ApolloServer} from '@apollo/server';
import {
    initializeDatabase,
    closeDatabase,
    clearDatabase,
    createTestServer,
    executeOperation,
    executeAuthenticatedOperation,
    operations
} from '../utils/testServer.js';
import {User} from '../../models/User.js';

describe('Authentication Integration Tests', () => {
    let server: ApolloServer;

    // Set up the database and server before all tests
    beforeAll(async () => {
        await initializeDatabase();
        server = createTestServer();
    });

    // Clear the database between tests
    afterEach(async () => {
        await clearDatabase();
    });

    // Close the database connection after all tests
    afterAll(async () => {
        await server.stop();
        await closeDatabase();
    });

    describe('User Registration', () => {
        it('should register a new user successfully', async () => {
            // Arrange
            const userInput = {
                name: 'New User',
                email: 'newuser@example.com',
                password: 'password123'
            };

            // Act
            const response = await executeOperation(server, {
                query: operations.registerUser,
                variables: {userInput}
            });

            // Assert
            expect(response.errors).toBeUndefined();
            expect(response.data?.createUser).toBeDefined();
            expect(response.data?.createUser.token).toBeDefined();
            expect(response.data?.createUser.userId).toBeDefined();
            expect(response.data?.createUser.tokenExpiration).toBe(1);

            // Verify user was created in the database
            const user = await User.findOne({email: userInput.email});
            expect(user).toBeDefined();
            expect(user!.name).toBe(userInput.name);
        });

        it('should not register a user with an existing email', async () => {
            // Arrange
            const userInput = {
                name: 'Existing User',
                email: 'existing@example.com',
                password: 'password123'
            };

            // Create a user with the same email
            await new User({
                name: userInput.name,
                email: userInput.email,
                password: 'hashedpassword'
            }).save();

            // Act
            const response = await executeOperation(server, {
                query: operations.registerUser,
                variables: {userInput}
            });

            // Assert
            expect(response.errors).toBeDefined();
            expect(response.errors![0].message).toContain('User already exists');
        });

        it('should validate user input', async () => {
            // Arrange
            const invalidUserInput = {
                name: 'Invalid User',
                email: 'invalid-email', // Invalid email format
                password: '123' // Too short
            };

            // Act
            const response = await executeOperation(server, {
                query: operations.registerUser,
                variables: {userInput: invalidUserInput}
            });

            // Assert
            expect(response.errors).toBeDefined();
        });
    });

    describe('User Login', () => {
        it('should login a user with valid credentials', async () => {
            // Arrange
            const userData = {
                name: 'Login Test User',
                email: 'login@example.com',
                password: 'password123'
            };

            // Create a user
            const user = new User(userData);
            await user.save();

            // Act
            const response = await executeOperation(server, {
                query: operations.login,
                variables: {
                    email: userData.email,
                    password: userData.password
                }
            });

            // Assert
            expect(response.errors).toBeUndefined();
            expect(response.data?.login).toBeDefined();
            expect(response.data?.login.token).toBeDefined();
            expect(response.data?.login.userId).toBe(user.id);
            expect(response.data?.login.tokenExpiration).toBe(1);
        });

        it('should not login with invalid credentials', async () => {
            // Arrange
            const userData = {
                name: 'Invalid Login User',
                email: 'invalid-login@example.com',
                password: 'password123'
            };

            // Create a user
            const user = new User(userData);
            await user.save();

            // Act
            const response = await executeOperation(server, {
                query: operations.login,
                variables: {
                    email: userData.email,
                    password: 'wrongpassword'
                }
            });

            // Assert
            expect(response.errors).toBeDefined();
            expect(response.errors![0].message).toContain('Invalid credentials');
        });

        it('should not login with non-existent email', async () => {
            // Act
            const response = await executeOperation(server, {
                query: operations.login,
                variables: {
                    email: 'nonexistent@example.com',
                    password: 'password123'
                }
            });

            // Assert
            expect(response.errors).toBeDefined();
            expect(response.errors![0].message).toContain('Invalid credentials');
        });
    });

    describe('User Authentication', () => {
        it('should fetch the authenticated user with a valid token', async () => {
            // Arrange
            const userData = {
                name: 'Auth Test User',
                email: 'auth@example.com',
                password: 'password123'
            };

            // Create a user and get token
            const user = new User(userData);
            const savedUser = await user.save();

            // Login to get a token
            const loginResponse = await executeOperation(server, {
                query: operations.login,
                variables: {
                    email: userData.email,
                    password: userData.password
                }
            });

            const token = loginResponse.data?.login.token;

            // Act
            const response = await executeAuthenticatedOperation(server, {
                query: operations.getMe
            }, token);

            // Assert
            expect(response.errors).toBeUndefined();
            expect(response.data?.me).toBeDefined();
            expect(response.data?.me.id).toBe(savedUser.id);
            expect(response.data?.me.name).toBe(userData.name);
            expect(response.data?.me.email).toBe(userData.email);
        });

        it('should not fetch the authenticated user without a token', async () => {
            // Act
            const response = await executeOperation(server, {
                query: operations.getMe
            });

            // Assert
            expect(response.errors).toBeDefined();
            expect(response.errors![0].message).toContain('Authentication required');
        });

        it('should not fetch the authenticated user with an invalid token', async () => {
            // Act
            const response = await executeAuthenticatedOperation(server, {
                query: operations.getMe
            }, 'invalid-token');

            // Assert
            expect(response.errors).toBeDefined();
            expect(response.errors![0].message).toContain('Authentication required');
        });
    });

    describe('User Queries', () => {
        it('should fetch a user by ID', async () => {
            // Arrange
            const userData = {
                name: 'Query Test User',
                email: 'query@example.com',
                password: 'password123'
            };

            // Create a user
            const user = new User(userData);
            const savedUser = await user.save();

            // Act
            const response = await executeOperation(server, {
                query: operations.getUser,
                variables: {id: savedUser.id}
            });

            // Assert
            expect(response.errors).toBeUndefined();
            expect(response.data?.user).toBeDefined();
            expect(response.data?.user.id).toBe(savedUser.id);
            expect(response.data?.user.name).toBe(userData.name);
            expect(response.data?.user.email).toBe(userData.email);
        });

        it('should return an error for non-existent user ID', async () => {
            // Act
            const response = await executeOperation(server, {
                query: operations.getUser,
                variables: {id: 'nonexistent-id'}
            });

            // Assert
            expect(response.errors).toBeDefined();
            expect(response.errors![0].message).toContain('User not found');
        });
    });
});
