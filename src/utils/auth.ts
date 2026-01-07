import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Define types
interface UserPayload {
  id: string;
  email: string;
}

// Generate JWT token for a user
export const generateToken = (user: { id: string; email: string }): string => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env['JWT_SECRET'] ?? 'default_secret',
    {
      expiresIn: '1d',
    },
  );
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

    const decoded = jwt.verify(token, process.env['JWT_SECRET'] ?? 'default_secret') as UserPayload;
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
      throw new Error('Authentication required');
    }
    return resolver(parent, args, context, info);
  };
};
