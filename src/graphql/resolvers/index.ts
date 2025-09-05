import {userResolvers} from './userResolvers';
import {eventResolvers} from './eventResolvers';
import {subscriptionResolvers} from './subscriptionResolvers';

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
