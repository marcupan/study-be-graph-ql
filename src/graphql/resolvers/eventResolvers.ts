import { GraphQLError } from 'graphql';
import type { PubSub } from 'graphql-subscriptions';
import mongoose from 'mongoose';

import type { IEvent } from '../../models/Event.js';
import { Event } from '../../models/Event.js';
import { requireAuth } from '../../utils/auth.js';
import type { Loaders } from '../../utils/dataLoaders.js';
import { paginateQuery } from '../../utils/pagination.js';

import { TOPICS } from './subscriptionResolvers.js';

interface EventConnection {
  edges: IEvent[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    currentPage: number;
    totalPages: number;
  };
  totalCount: number;
}

interface EventInput {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
}

interface PaginationInput {
  page?: number;
  limit?: number;
}

interface Context {
  user?: {
    id: string;
    email: string;
  };
  loaders: Loaders;
  pubsub: PubSub;
}

export const eventResolvers = {
  Query: {
    events: async (
      _: unknown,
      { pagination }: { pagination?: PaginationInput },
    ): Promise<EventConnection> => {
      try {
        const query = Event.find().sort({ createdAt: -1 });
        return await paginateQuery(query, Event, {}, pagination);
      } catch (_err) {
        throw new Error('Error fetching events');
      }
    },
    event: async (
      _: unknown,
      { id }: { id: string },
      { loaders }: Context,
    ): Promise<IEvent | null> => {
      try {
        const event = await loaders.eventLoader.load(id);
        if (!event) {
          throw new Error('Event not found');
        }
        return event;
      } catch (_err) {
        throw new Error('Event not found');
      }
    },
    eventsByDate: async (
      _: unknown,
      { date, pagination }: { date: string; pagination?: PaginationInput },
    ): Promise<EventConnection> => {
      try {
        // Create a Date object from the input string
        const searchDate = new Date(date);

        // Set time to beginning of day
        searchDate.setHours(0, 0, 0, 0);

        // Create a Date object for the end of the day
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const filter = {
          date: {
            $gte: searchDate,
            $lt: nextDay,
          },
        };

        const query = Event.find(filter).sort({ time: 1 });
        return await paginateQuery(query, Event, filter, pagination);
      } catch (_err) {
        throw new Error('Error fetching events by date');
      }
    },
    eventsByLocation: async (
      _: unknown,
      {
        location,
        pagination,
      }: {
        location: string;
        pagination?: PaginationInput;
      },
    ): Promise<EventConnection> => {
      try {
        // Case-insensitive search for location
        const filter = {
          location: { $regex: location, $options: 'i' },
        };

        const query = Event.find(filter).sort({ date: 1 });
        return await paginateQuery(query, Event, filter, pagination);
      } catch (_err) {
        throw new Error('Error fetching events by location');
      }
    },
    eventsByUser: async (
      _: unknown,
      { userId, pagination }: { userId: string; pagination?: PaginationInput },
    ): Promise<EventConnection> => {
      try {
        const filter = { creator: userId };
        const query = Event.find(filter).sort({ createdAt: -1 });
        return await paginateQuery(query, Event, filter, pagination);
      } catch (_err) {
        throw new Error('Error fetching events by user');
      }
    },
    myEvents: requireAuth(
      async (_: unknown, { pagination }: { pagination?: PaginationInput }, { user }: Context) => {
        try {
          const filter = { creator: user!.id };
          const query = Event.find(filter).sort({ createdAt: -1 });
          return await paginateQuery(query, Event, filter, pagination);
        } catch (_err) {
          throw new Error('Error fetching your events');
        }
      },
    ),
    myAttendingEvents: requireAuth(
      async (
        _: unknown,
        {
          pagination,
        }: {
          pagination?: PaginationInput;
        },
        { user }: Context,
      ) => {
        try {
          const filter = { attendees: user!.id };
          const query = Event.find(filter).sort({ date: 1 });
          return await paginateQuery(query, Event, filter, pagination);
        } catch (_err) {
          throw new Error('Error fetching events you are attending');
        }
      },
    ),
  },
  Mutation: {
    createEvent: requireAuth(
      async (_: unknown, { eventInput }: { eventInput: EventInput }, { user, pubsub }: Context) => {
        try {
          const event = new Event({
            ...eventInput,
            creator: user!.id,
            attendees: [],
          });

          const result = await event.save();

          // Publish the event creation for subscriptions
          void pubsub.publish(TOPICS.EVENT_CREATED, { eventCreated: result });

          return result;
        } catch (_err) {
          throw new Error('Error creating event');
        }
      },
    ),
    updateEvent: requireAuth(
      async (
        _: unknown,
        {
          id,
          eventInput,
        }: {
          id: string;
          eventInput: EventInput;
        },
        { user, pubsub }: Context,
      ) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }
          // Find the event
          const event = await Event.findById(id);
          if (!event) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }

          // Check if the user is the creator of the event
          if (event.creator.toString() !== user!.id) {
            throw new GraphQLError('Not authorized to update this event', {
              extensions: { code: 'FORBIDDEN' },
            });
          }

          // Update the event
          const updatedEvent = await Event.findByIdAndUpdate(id, { ...eventInput }, { new: true });

          // Publish the event update for subscriptions
          void pubsub.publish(TOPICS.EVENT_UPDATED, { eventUpdated: updatedEvent });

          return updatedEvent;
        } catch (_err) {
          throw _err;
        }
      },
    ),
    deleteEvent: requireAuth(
      async (_: unknown, { id }: { id: string }, { user, pubsub }: Context) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }
          const event = await Event.findById(id);
          if (!event) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }

          // Check if the user is the creator of the event
          if (event.creator.toString() !== user!.id) {
            throw new GraphQLError('Not authorized to delete this event', {
              extensions: { code: 'FORBIDDEN' },
            });
          }

          // Delete the event
          await Event.findByIdAndDelete(id);

          // Publish the event deletion for subscriptions
          void pubsub.publish(TOPICS.EVENT_DELETED, { eventDeleted: id });

          return true;
        } catch (_err) {
          throw _err;
        }
      },
    ),
    attendEvent: requireAuth(
      async (
        _: unknown,
        { eventId }: { eventId: string },
        { user, pubsub, loaders }: Context,
        _info: unknown,
      ) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(eventId)) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }
          // Find the event
          const event = await Event.findById(eventId);
          if (!event) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }
          if (event.attendees.some(attendeeId => attendeeId.toString() === user!.id)) {
            throw new GraphQLError('Already attending this event', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }

          // Add user to attendees
          event.attendees.push(user!.id as unknown as (typeof event.attendees)[0]);
          await event.save();

          // Get the user data for the subscription
          const userData = await loaders.userLoader.load(user!.id);

          // Publish the user joined event for subscriptions
          void pubsub.publish(TOPICS.USER_JOINED_EVENT, {
            userJoinedEvent: userData,
            eventId,
          });

          return event;
        } catch (_err) {
          throw _err;
        }
      },
    ),
    cancelAttendance: requireAuth(
      async (
        _: unknown,
        { eventId }: { eventId: string },
        { user, pubsub, loaders }: Context,
        _info: unknown,
      ) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(eventId)) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }
          // Find the event
          const event = await Event.findById(eventId);
          if (!event) {
            throw new GraphQLError('Event not found', { extensions: { code: 'BAD_USER_INPUT' } });
          }

          // Check if user is attending
          if (!event.attendees.some(attendeeId => attendeeId.toString() === user!.id)) {
            throw new GraphQLError('Not attending this event', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }

          // Get the user data for the subscription before removing from attendees
          const userData = await loaders.userLoader.load(user!.id);

          // Remove user from attendees
          event.attendees = event.attendees.filter(
            attendeeId => attendeeId.toString() !== user!.id,
          );
          await event.save();

          // Publish the user left event for subscriptions
          void pubsub.publish(TOPICS.USER_LEFT_EVENT, {
            userLeftEvent: userData,
            eventId,
          });

          return event;
        } catch (_err) {
          throw _err;
        }
      },
    ),
  },
  Event: {
    creator: async (
      parent: IEvent,
      _: unknown,
      { loaders }: Context,
      _info: unknown,
    ): Promise<unknown> => {
      try {
        return await loaders.userLoader.load(parent.creator.toString());
      } catch (_err) {
        throw new Error('Error fetching creator');
      }
    },
    attendees: async (
      parent: IEvent,
      _: unknown,
      { loaders }: Context,
      _info: unknown,
    ): Promise<unknown> => {
      try {
        return await loaders.eventAttendeesLoader.load(parent._id.toString());
      } catch (_err) {
        throw new Error('Error fetching attendees');
      }
    },
  },
};
