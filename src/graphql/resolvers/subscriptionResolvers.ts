import type { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';

// Extend PubSub type to include an asyncIterator method
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

const getPubSubOrThrow = (context: Context | undefined): ExtendedPubSub => {
  if (!context?.pubsub) {
    throw new Error('PubSub not available in context');
  }
  return context.pubsub;
};

const createTopicSubscribe =
  (topic: string) =>
  (_: unknown, __: unknown, context: Context | undefined): AsyncIterator<unknown> =>
    getPubSubOrThrow(context).asyncIterator([topic]);

const eventUpdatedFilter = (payload: unknown, variables: unknown): boolean => {
  const eventPayload = payload as EventUpdatedPayload | undefined;
  const eventVars = variables as EventIdVariables | undefined;
  // If the payload is undefined or variables are not provided, don't send updates
  if (!eventPayload || !eventVars) {
    return false;
  }
  // If no eventId is provided, send all updates
  if (!eventVars.eventId) {
    return true;
  }
  // Otherwise, only send updates for the specified event
  return eventPayload.eventUpdated.id === eventVars.eventId;
};

const userEventFilter = (payload: unknown, variables: unknown): boolean => {
  const userPayload = payload as UserEventPayload | undefined;
  const userVars = variables as EventIdVariables | undefined;
  // If the payload is undefined or variables are not provided, don't send updates
  if (!userPayload || !userVars?.eventId) {
    return false;
  }
  return userPayload.eventId === userVars.eventId;
};

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
      subscribe: createTopicSubscribe(TOPICS.EVENT_CREATED),
    },

    // Subscription for when an event is updated
    // Can be filtered by eventId
    eventUpdated: {
      subscribe: withFilter(createTopicSubscribe(TOPICS.EVENT_UPDATED), eventUpdatedFilter),
    },

    // Subscription for when an event is deleted
    eventDeleted: {
      subscribe: createTopicSubscribe(TOPICS.EVENT_DELETED),
    },

    // Subscription for when a user joins an event
    // Filtered by eventId
    userJoinedEvent: {
      subscribe: withFilter(createTopicSubscribe(TOPICS.USER_JOINED_EVENT), userEventFilter),
    },

    // Subscription for when a user leaves an event
    // Filtered by eventId
    userLeftEvent: {
      subscribe: withFilter(createTopicSubscribe(TOPICS.USER_LEFT_EVENT), userEventFilter),
    },
  },
};
