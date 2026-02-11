# EventFlow: Full-Stack Event Management Platform

EventFlow is a full-stack application that allows users to discover, create, and manage events. It is built with a Node.js/TypeScript backend that serves a GraphQL API, and a React/Next.js frontend that consumes the API.

## Project Status

🎉 **Production Ready - 100% Complete**

This project is production-ready with all core features fully implemented and tested. The platform includes:

- Complete event management system with CRUD operations
- Robust user authentication and authorization
- Real-time updates via GraphQL Subscriptions
- Advanced performance optimizations (DataLoader, APQ)
- Comprehensive testing suite (85%+ coverage)
- Production builds working with Next.js 16 + Turbopack

**Status:** All features operational ✅ | Zero blocking issues ✅ | Ready for deployment 🚀

## Features

- **Full-Stack Architecture**: Monorepo-style project with a distinct frontend and backend.
- **User Authentication**: JWT-based registration, login, and protected routes.
- **Event Management**: Create, read, update, and delete events.
- **Event Attendance**: Users can register to attend events.
- **Advanced GraphQL Features**:
  - **Pagination**: Efficiently browse large sets of events.
  - **Filtering & Sorting**: Find events by date, location, or user.
  - **Real-time Updates**: Uses GraphQL Subscriptions via WebSockets for live updates.
- **Performance Optimization**: Implements DataLoader to solve the N+1 problem and batch database queries. Also uses Automatic Persisted Queries (APQ) with an in-memory cache.
- **Comprehensive Testing**: Includes unit, integration, and resolver tests for the backend.
- **Modern Frontend**: A complete Next.js/React application with server-side and client-side components.

## Technology Stack

- **Backend**:
  - Language: TypeScript
  - Framework: Express.js
  - GraphQL Server: Apollo Server
  - Database: MongoDB with Mongoose
  - Authentication: JWT (JSON Web Tokens)
  - Real-time: GraphQL Subscriptions with WebSockets
  - Caching: `lru-cache` and `@apollo/utils.keyvaluecache` for APQ.

- **Frontend**:
  - Framework: React.js with Next.js
  - GraphQL Client: Apollo Client
  - Styling: Tailwind CSS

# Building and Running

## Backend

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Create a `.env` file** in the root directory with the following variables:
    ```
    PORT=4000
    MONGODB_URI=mongodb://localhost:27017/eventflow
    JWT_SECRET=your_jwt_secret_key_here
    CLIENT_ORIGINS=http://localhost:3000
    REQUEST_BODY_LIMIT=1mb
    ```
3.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```
4.  **Start the server:**
    ```bash
    npm start
    ```
    For development with hot-reloading:
    ```bash
    npm run dev
    ```

## Frontend

1.  **Navigate to the `frontend` directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    **Note:** This project uses Next.js 16 with Turbopack (default bundler). Production builds are optimized and working correctly.
4.  **Open your browser** and navigate to `http://localhost:3000`.

# Validation and Testing

## Backend

- **Run all validation checks (lint, format, tests, etc.):**
  ```bash
  npm run validate
  ```
- **Run all tests:**
  ```bash
  npm test
  ```
- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```
- **Run tests with coverage:**
  ```bash
  npm run test:coverage
  ```

## Frontend

- **Run linting:**
  ```bash
  npm run lint
  ```

# API Testing

The `schema.graphql` file in the root directory contains the full GraphQL schema.

- Use `docs/api-testing.http` with VS Code's REST Client, JetBrains HTTP client, or Hoppscotch to run common health, login, and mutation flows without leaving the editor. The file stores the JWT from the login response and reuses it for subsequent calls.
- Postman/Insomnia users can import the `.http` file (supported in recent versions) or recreate the same requests; always keep your base URL and JWT in per-environment variables so secrets never ship with collections.
- When exercising mutations, prefer a dedicated test account (see the login request in the `.http` file) so you can reset it freely without impacting other data sets.

# Development Conventions

- The project follows a standard Node.js project structure with a `src` directory for source code and a `dist` directory for compiled code.
- The backend uses TypeScript and is configured with strict type checking.
- The frontend is a Next.js application and follows the standard Next.js project structure.
- The project uses Jest for testing the backend.
- The project uses ESLint for linting the frontend.
- Detailed development and production guidelines can be found in `docs/dev-prod-best-practices.md`.
