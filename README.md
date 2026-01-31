# EventFlow: Full-Stack Event Management Platform

EventFlow is a full-stack application that allows users to discover, create, and manage events. It is built with a Node.js/TypeScript backend that serves a GraphQL API, and a React/Next.js frontend that consumes the API.

## Project Status

This project is in an advanced stage of development. Core features for event management and user authentication are fully implemented on both the backend and frontend. The platform also includes advanced features like real-time updates with GraphQL Subscriptions, performance optimization with DataLoader, and comprehensive testing.

## Features

- **Full-Stack Architecture**: Monorepo-style project with a distinct frontend and backend.
- **User Authentication**: JWT-based registration, login, and protected routes.
- **Event Management**: Create, read, update, and delete events.
- **Event Attendance**: Users can register to attend events.
- **Advanced GraphQL Features**:
  - **Pagination**: Efficiently browse large sets of events.
  - **Filtering & Sorting**: Find events by date, location, or user.
  - **Real-time Updates**: Uses GraphQL Subscriptions via WebSockets for live updates.
- **Performance Optimization**: Implements DataLoader to solve the N+1 problem and batch database queries.
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
4.  **Open your browser** and navigate to `http://localhost:3000`.

# Testing

## Backend

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

# Development Conventions

- The project follows a standard Node.js project structure with a `src` directory for source code and a `dist` directory for compiled code.
- The backend uses TypeScript and is configured with strict type checking.
- The frontend is a Next.js application and follows the standard Next.js project structure.
- The project uses Jest for testing the backend.
- The project uses ESLint for linting the frontend.
- Detailed development and production guidelines can be found in `docs/dev-prod-best-practices.md`.
