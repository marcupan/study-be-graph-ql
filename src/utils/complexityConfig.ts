/**
 * Configuration for GraphQL query complexity analysis
 * This file defines complexity values for different fields in the schema
 */

import type { GraphQLField } from 'graphql';

// Define complexity values for specific fields
export const getFieldComplexity = (type: string, field: string): number => {
  // Default complexity for simple fields
  const defaultComplexity = 1;

  // Complexity map for different types and fields
  const complexityMap: Record<string, Record<string, number>> = {
    Query: {
      // Connection fields have higher complexity
      events: 10,
      users: 10,
      eventsByDate: 10,
      eventsByLocation: 10,
      eventsByUser: 10,
      myEvents: 10,
      myAttendingEvents: 10,
      // Single item lookups have lower complexity
      event: 2,
      user: 2,
      me: 2,
    },
    User: {
      // Fields that require additional lookups
      events: 5,
      attendingEvents: 5,
    },
    Event: {
      // Fields that require additional lookups
      creator: 3,
      attendees: 5,
    },
    Mutation: {
      // Mutations have higher complexity
      createUser: 5,
      login: 5,
      createEvent: 5,
      updateEvent: 5,
      deleteEvent: 3,
      attendEvent: 4,
      cancelAttendance: 4,
    },
  };

  // Return the complexity value if defined, otherwise return default
  return complexityMap[type]?.[field] || defaultComplexity;
};

// Helper function to get complexity for a field in the schema
export const getComplexityForField = (
  field: GraphQLField<unknown, unknown>,
  typeName: string,
): number => {
  return getFieldComplexity(typeName, field.name);
};
