import { withFilter, PubSub } from 'graphql-subscriptions';
import { IUser } from '../../models/User';
import { IEvent } from '../../models/Event';

// Extend PubSub type to include asyncIterator method
interface ExtendedPubSub extends PubSub {
  asyncIterator<T>(triggers: string | string[]): AsyncIterator<T>;
}

interface Context {
  pubsub: ExtendedPubSub;
}

interface EventUpdatedPayload {
  eventUpdated: {
    id: string;
  };
}

interface EventIdVariables {
  eventId?: string;
}

interface UserEventPayload {
  eventId: string;
}

// Define subscription topics
export const TOPICS = {
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_DELETED: 'EVENT_DELETED',
  USER_JOINED_EVENT: 'USER_JOINED_EVENT',
  USER_LEFT_EVENT: 'USER_LEFT_EVENT',
};

// Define the subscription resolvers
export const subscriptionResolvers = {
  Subscription: {
    // Subscription for when a new event is created
    eventCreated: {
      subscribe: (_: any, __: any, context: Context | undefined) => {
        if (!context || !context.pubsub) {
          throw new Error('PubSub not available in context');
        }
        return context.pubsub.asyncIterator([TOPICS.EVENT_CREATED]);
      },
    },

    // Subscription for when an event is updated
    // Can be filtered by eventId
    eventUpdated: {
      subscribe: withFilter(
        (_: any, __: any, context: Context | undefined) => {
          if (!context || !context.pubsub) {
            throw new Error('PubSub not available in context');
          }
          return context.pubsub.asyncIterator([TOPICS.EVENT_UPDATED]);
        },
        (payload?: EventUpdatedPayload, variables?: EventIdVariables) => {
          // If payload is undefined or variables are not provided, don't send updates
          if (!payload || !variables) {
            return false;
          }
          // If no eventId is provided, send all updates
          if (!variables.eventId) {
            return true;
          }
          // Otherwise, only send updates for the specified event
          return payload.eventUpdated.id === variables.eventId;
        }
      ),
    },

    // Subscription for when an event is deleted
    eventDeleted: {
      subscribe: (_: any, __: any, context: Context | undefined) => {
        if (!context || !context.pubsub) {
          throw new Error('PubSub not available in context');
        }
        return context.pubsub.asyncIterator([TOPICS.EVENT_DELETED]);
      },
    },

    // Subscription for when a user joins an event
    // Filtered by eventId
    userJoinedEvent: {
      subscribe: withFilter(
        (_: any, __: any, context: Context | undefined) => {
          if (!context || !context.pubsub) {
            throw new Error('PubSub not available in context');
          }
          return context.pubsub.asyncIterator([TOPICS.USER_JOINED_EVENT]);
        },
        (payload?: UserEventPayload, variables?: EventIdVariables) => {
          // If payload is undefined or variables are not provided, don't send updates
          if (!payload || !variables || !variables.eventId) {
            return false;
          }
          return payload.eventId === variables.eventId;
        }
      ),
    },

    // Subscription for when a user leaves an event
    // Filtered by eventId
    userLeftEvent: {
      subscribe: withFilter(
        (_: any, __: any, context: Context | undefined) => {
          if (!context || !context.pubsub) {
            throw new Error('PubSub not available in context');
          }
          return context.pubsub.asyncIterator([TOPICS.USER_LEFT_EVENT]);
        },
        (payload?: UserEventPayload, variables?: EventIdVariables) => {
          // If payload is undefined or variables are not provided, don't send updates
          if (!payload || !variables || !variables.eventId) {
            return false;
          }
          return payload.eventId === variables.eventId;
        }
      ),
    },
  },
};
