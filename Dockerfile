# Use Node.js LTS version as the base image
FROM node:18-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Prune dev dependencies only for production builds
RUN if [ "$NODE_ENV" = "production" ]; then npm prune --production; fi

# Expose the port the app runs on
EXPOSE 4000

# Command to run the application
CMD ["node", "dist/index.js"]
