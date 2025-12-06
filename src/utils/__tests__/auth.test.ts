import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {generateToken, verifyPassword, hashPassword, getUserFromToken, requireAuth} from '../auth.js';

// Mock bcrypt and jwt
jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn()
}));

describe('Auth Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateToken', () => {
        it('should call jwt.sign with correct parameters', () => {
            // Arrange
            const user = {id: '123', email: 'test@example.com'};
            const mockToken = 'mock-token';
            (jwt.sign as jest.Mock).mockReturnValue(mockToken);

            // Act
            const result = generateToken(user);

            // Assert
            expect(jwt.sign).toHaveBeenCalledWith(
                {id: user.id, email: user.email},
                expect.any(String),
                {expiresIn: '1d'}
            );
            expect(result).toBe(mockToken);
        });
    });

    describe('verifyPassword', () => {
        it('should call bcrypt.compare with correct parameters', async () => {
            // Arrange
            const plainPassword = 'password123';
            const hashedPassword = 'hashed-password';
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Act
            const result = await verifyPassword(plainPassword, hashedPassword);

            // Assert
            expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(true);
        });
    });

    describe('hashPassword', () => {
        it('should call bcrypt.hash with correct parameters', async () => {
            // Arrange
            const password = 'password123';
            const hashedPassword = 'hashed-password';
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

            // Act
            const result = await hashPassword(password);

            // Assert
            expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
            expect(result).toBe(hashedPassword);
        });
    });

    describe('getUserFromToken', () => {
        it('should return null if token is empty', () => {
            // Act
            const result = getUserFromToken('');

            // Assert
            expect(result).toBeNull();
            expect(jwt.verify).not.toHaveBeenCalled();
        });

        it('should remove Bearer prefix if present', () => {
            // Arrange
            const token = 'Bearer token123';
            const decodedToken = {id: '123', email: 'test@example.com'};
            (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

            // Act
            const result = getUserFromToken(token);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith('token123', expect.any(String));
            expect(result).toEqual(decodedToken);
        });

        it('should return null if verification fails', () => {
            // Arrange
            const token = 'token123';
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            // Act
            const result = getUserFromToken(token);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('requireAuth', () => {
        it('should throw error if user is not authenticated', () => {
            // Arrange
            const resolver = jest.fn();
            const wrappedResolver = requireAuth(resolver);
            const parent = {};
            const args = {};
            const context = {user: undefined};
            const info = {};

            // Act & Assert
            expect(() => wrappedResolver(parent, args, context, info)).toThrow('Authentication required');
            expect(resolver).not.toHaveBeenCalled();
        });

        it('should call resolver if user is authenticated', () => {
            // Arrange
            const resolver = jest.fn().mockReturnValue('result');
            const wrappedResolver = requireAuth(resolver);
            const parent = {};
            const args = {};
            const context = {user: {id: '123', email: 'test@example.com'}};
            const info = {};

            // Act
            const result = wrappedResolver(parent, args, context, info);

            // Assert
            expect(resolver).toHaveBeenCalledWith(parent, args, context, info);
            expect(result).toBe('result');
        });
    });
});
