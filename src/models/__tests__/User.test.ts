import mongoose from 'mongoose';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {User, IUser} from '../User.js';

describe('User Model', () => {
    let mongoServer: MongoMemoryServer;

    // Set up the in-memory MongoDB server before tests
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    // Clear the database between tests
    afterEach(async () => {
        await User.deleteMany({});
    });

    // Close the connection and stop the server after tests
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it('should create a new user successfully', async () => {
        // Arrange
        const userData = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        };

        // Act
        const user = new User(userData);
        const savedUser = await user.save();

        // Assert
        expect(savedUser._id).toBeDefined();
        expect(savedUser.name).toBe(userData.name);
        expect(savedUser.email).toBe(userData.email);
        expect(savedUser.password).toBe(userData.password);
        expect(savedUser.createdAt).toBeDefined();
        expect(savedUser.updatedAt).toBeDefined();
    });

    it('should fail validation when required fields are missing', async () => {
        // Arrange
        const userWithoutName = new User({
            email: 'test@example.com',
            password: 'password123'
        });

        const userWithoutEmail = new User({
            name: 'Test User',
            password: 'password123'
        });

        const userWithoutPassword = new User({
            name: 'Test User',
            email: 'test@example.com'
        });

        // Act & Assert
        await expect(userWithoutName.validate()).rejects.toThrow();
        await expect(userWithoutEmail.validate()).rejects.toThrow();
        await expect(userWithoutPassword.validate()).rejects.toThrow();
    });

    it('should fail validation when email is invalid', async () => {
        // Arrange
        const userWithInvalidEmail = new User({
            name: 'Test User',
            email: 'invalid-email',
            password: 'password123'
        });

        // Act & Assert
        await expect(userWithInvalidEmail.validate()).rejects.toThrow();
    });

    it('should fail validation when password is too short', async () => {
        // Arrange
        const userWithShortPassword = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: '12345' // Less than 6 characters
        });

        // Act & Assert
        await expect(userWithShortPassword.validate()).rejects.toThrow();
    });

    it('should enforce email uniqueness', async () => {
        // Arrange
        const userData = {
            name: 'Test User',
            email: 'unique@example.com',
            password: 'password123'
        };

        // Act
        await new User(userData).save();
        await User.createIndexes();

        // Assert - Trying to save another user with the same email should fail
        await expect(new User(userData).save()).rejects.toThrow();
    });

    it('should trim whitespace from name and email', async () => {
        // Arrange
        const userData = {
            name: '  Test User  ',
            email: '  test@example.com  ',
            password: 'password123'
        };

        // Act
        const user = new User(userData);
        const savedUser = await user.save();

        // Assert
        expect(savedUser.name).toBe('Test User');
        expect(savedUser.email).toBe('test@example.com');
    });

    it('should convert email to lowercase', async () => {
        // Arrange
        const userData = {
            name: 'Test User',
            email: 'TEST@EXAMPLE.COM',
            password: 'password123'
        };

        // Act
        const user = new User(userData);
        const savedUser = await user.save();

        // Assert
        expect(savedUser.email).toBe('test@example.com');
    });
});
