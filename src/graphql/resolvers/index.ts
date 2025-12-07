import {userResolvers} from './userResolvers.js';
import {eventResolvers} from './eventResolvers.js';
import {subscriptionResolvers} from './subscriptionResolvers.js';

// Merge all resolvers
export const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...eventResolvers.Query,
    },
    Mutation: {
        ...userResolvers.Mutation,
        ...eventResolvers.Mutation,
    },
    Subscription: {
        ...subscriptionResolvers.Subscription,
    },
    User: {
        ...userResolvers.User,
    },
    Event: {
        ...eventResolvers.Event,
    },
};
