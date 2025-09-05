# EventFlow - A GraphQL-Powered Event Management Platform

EventFlow is a full-stack application that allows users to discover, create, and manage events. The core of this application is a robust GraphQL API serving data to a modern web frontend.

## Learning Roadmap: GraphQL with JavaScript/TypeScript Backend

This project serves as a comprehensive learning path from beginner to advanced GraphQL concepts with a JavaScript/TypeScript backend. Follow this roadmap to progressively build your understanding:

### 1. Basic Setup and Configuration
- **Project Initialization**: Setting up a Node.js project with TypeScript (`package.json`, `tsconfig.json`)
- **Server Setup**: Configuring Express and Apollo Server (`src/index.ts`)
- **Environment Variables**: Managing configuration with dotenv (`.env`)

### 2. Schema Definition
- **GraphQL SDL**: Defining types, queries, and mutations (`src/graphql/typeDefs.ts`)
- **Type Relationships**: Establishing connections between different entity types
- **Input Types**: Creating specialized input types for mutations

### 3. Database Integration
- **MongoDB Setup**: Connecting to MongoDB with Mongoose
- **Data Models**: Defining schemas and models (`src/models/`)
- **Document Relationships**: Managing relationships between collections

### 4. Resolver Implementation
- **Basic Resolvers**: Implementing query and mutation resolvers
- **Field Resolvers**: Resolving nested fields and relationships
- **Resolver Organization**: Structuring resolvers by domain (`src/graphql/resolvers/`)

### 5. Authentication and Authorization
- **User Authentication**: Registration and login flows
- **JWT Implementation**: Token generation and verification (`src/utils/auth.ts`)
- **Protected Resolvers**: Securing resolvers with authentication middleware

### 6. Advanced Querying
- **Filtering**: Implementing filters (by date, location, user)
- **Sorting**: Ordering results
- **Pagination**: Limiting and paginating large result sets (to be implemented)

### 7. Error Handling and Validation
- **GraphQL Errors**: Using Apollo's error types
- **Input Validation**: Validating user inputs
- **Error Propagation**: Properly handling and returning errors

### 8. Performance Optimization (Advanced)
- **Batching and Caching**: Implementing DataLoader (to be implemented)
- **Query Complexity**: Analyzing and limiting complex queries (to be implemented)
- **Persisted Queries**: Optimizing frequently used queries (to be implemented)

### 9. Real-time Features (Advanced)
- **GraphQL Subscriptions**: Implementing real-time updates (to be implemented)
- **WebSocket Integration**: Setting up subscription transport (to be implemented)
- **Event-based Architecture**: Managing real-time events (to be implemented)

### 10. Testing and Deployment (Advanced)
- **Unit Testing**: Testing resolvers and utilities (to be implemented)
- **Integration Testing**: End-to-end API testing (to be implemented)
- **Deployment Strategies**: Preparing for production (to be implemented)

## Features

- **User Authentication**:
  - Register, login, and logout functionality
  - Basic user profiles (name, email)

- **Event Management**:
  - Create events with details like title, description, date, time, location, and an optional image URL
  - View all public events
  - View details of a specific event
  - Filter events by date, location, or user
  - Update and delete your own events

- **Event Registration/Participation**:
  - Register interest in attending an event
  - View a list of events you've registered for
  - See a list of users registered for a specific event

- **Search and Filtering**:
  - Filter events by date, location, or user

## Technology Stack

- **Backend**:
  - Language: TypeScript
  - Framework: Express.js
  - GraphQL Server: Apollo Server
  - Database: MongoDB (using Mongoose ODM)
  - Authentication: JWT (JSON Web Tokens)

- **Frontend** (to be implemented):
  - Framework: React.js (built with Next.js)
  - GraphQL Client: Apollo Client
  - Styling: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/eventflow.git
   cd eventflow
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=4000
   MONGODB_URI=mongodb://localhost:27017/eventflow
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. Build the TypeScript code:
   ```
   npm run build
   ```

5. Start the server:
   ```
   npm start
   ```

   For development with hot-reloading:
   ```
   npm run dev
   ```

6. The GraphQL API will be available at `http://localhost:4000/graphql`

## GraphQL API

### Queries

- `events`: Get all events
- `event(id: ID!)`: Get a specific event by ID
- `users`: Get all users
- `user(id: ID!)`: Get a specific user by ID
- `me`: Get the currently authenticated user
- `eventsByDate(date: String!)`: Get events on a specific date
- `eventsByLocation(location: String!)`: Get events at a specific location
- `eventsByUser(userId: ID!)`: Get events created by a specific user
- `myEvents`: Get events created by the authenticated user
- `myAttendingEvents`: Get events the authenticated user is attending

### Mutations

- `createUser(userInput: UserInput!)`: Register a new user
- `login(email: String!, password: String!)`: Login a user
- `createEvent(eventInput: EventInput!)`: Create a new event
- `updateEvent(id: ID!, eventInput: EventInput!)`: Update an existing event
- `deleteEvent(id: ID!)`: Delete an event
- `attendEvent(eventId: ID!)`: Register to attend an event
- `cancelAttendance(eventId: ID!)`: Cancel attendance for an event

## License

This project is licensed under the ISC License.


---

## Handling the nested Git repository in `frontend/`

If you see this warning when running `git add .` in the root repo:

```
warning: adding embedded git repository: frontend
```

It means `frontend/` has its own `.git` directory. You have three paths forward. Pick ONE based on how you want to structure your project.

### Option A: Make it a single repo (monorepo-style)
Use this if you want `frontend/` to be tracked as part of this root repository.

Commands (run from the `frontend/` directory first):

```
cd frontend
# Keep the project files, but remove the nested repo metadata
rm -rf .git
cd ..
# Ensure the outer repo does not try to add a nested repo
# (this repo already ignores frontend/.git via root .gitignore)

git add frontend
git commit -m "Fold frontend into monorepo"
```

If `frontend` had already been staged as an embedded repo, clean it from the index first:
```
# From repo root
git rm --cached -r frontend
```
Then add and commit again:
```
git add frontend
git commit -m "Track frontend as part of monorepo"
```

### Option B: Make `frontend` a proper Git submodule
Use this if you want the frontend developed in its own repository.

Steps:
1) Create and push a separate repository for `frontend` (e.g., on GitHub/GitLab).
2) Remove any currently staged `frontend` entry from the root repo index:
```
git rm --cached -r frontend
```
3) Add it as a submodule:
```
git submodule add <frontend-repo-url> frontend
git commit -m "Add frontend as submodule"
```
4) Team members will then run:
```
git clone <root-repo-url>
git submodule update --init --recursive
```

### Option C: Keep `frontend` as its own repo but ignore it from the root repo
Use this if you want to work on `frontend` locally as a separate repo, but not include it in the root repository at all.

Actions:
- Ensure the root `.gitignore` contains:
```
frontend/.git/
```
- Remove anything already staged from the root index:
```
git rm --cached -r frontend
```
- Commit the ignore update:
```
git add .gitignore
git commit -m "Ignore nested frontend repo metadata"
```

After selecting and applying your preferred option, the warning will be resolved.
