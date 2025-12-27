// This file is used to set up the test environment before running tests

// Set a longer timeout for tests that might take longer (like database operations)
jest.setTimeout(30000);

// Mock environment variables
process.env.JWT_SECRET = 'test_secret_key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/eventflow_test';

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};
