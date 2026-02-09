import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';

// Define types
interface UserPayload {
  id: string;
  email: string;
}

// Generate JWT token for a user
export const generateToken = (user: { id: string; email: string }): string => {
  return jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: '1d',
  });
};

// Verify password
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

// Get user from token
export const getUserFromToken = (token: string): UserPayload | null => {
  if (!token || token === '') {
    return null;
  }

  try {
    // Remove "Bearer " prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as UserPayload;
    return decoded;
  } catch (_err) {
    return null;
  }
};

// Authentication middleware
export const requireAuth = <T, U, V, W>(
  resolver: (parent: T, args: U, context: V, info: W) => unknown,
): ((parent: T, args: U, context: V & { user?: UserPayload }, info: W) => unknown) => {
  return (parent: T, args: U, context: V & { user?: UserPayload }, info: W) => {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return resolver(parent, args, context, info);
  };
};
