import { GraphQLError } from 'graphql';
import type { PubSub } from 'graphql-subscriptions';
import { Types } from 'mongoose';

import { logger } from '../../logger.js';
import { Event } from '../../models/Event.js';
import type { IEvent } from '../../models/Event.js';
import type { IUser } from '../../models/User.js';
import { requireAuth } from '../../utils/auth.js';
import type { Loaders } from '../../utils/dataLoaders.js';
import { paginateQuery } from '../../utils/pagination.js';
import { escapeRegex } from '../../utils/sanitize.js';

import { checkIsCreator } from './helpers/authHelpers.js';
import { findEventOrThrow } from './helpers/eventHelpers.js';
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

const paginateEvents = async (
  filter: Record<string, unknown>,
  sort: Record<string, 1 | -1>,
  pagination?: PaginationInput,
): Promise<EventConnection> => {
  const query = Event.find(filter).sort(sort);
  return paginateQuery(query, Event, filter, pagination);
};

export const eventResolvers = {
  Query: {
    events: async (
      _: unknown,
      { pagination }: { pagination?: PaginationInput },
    ): Promise<EventConnection> => {
      try {
        const query = Event.find().sort({ createdAt: -1 });

        return await paginateQuery(query, Event, {}, pagination);
      } catch (err) {
        logger.error(err);

        throw new GraphQLError('Error fetching events', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    event: async (
      _: unknown,
      { id }: { id: string },
      { loaders }: Context,
    ): Promise<IEvent | null> => {
      try {
        return await loaders.eventLoader.load(id);
      } catch (err) {
        logger.error(err);

        throw new GraphQLError('Error fetching event', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    eventsByDate: async (
      _: unknown,
      { date, pagination }: { date: string; pagination?: PaginationInput },
    ): Promise<EventConnection> => {
      try {
        const searchDate = new Date(date);

        if (Number.isNaN(searchDate.getTime())) {
          throw new GraphQLError('Invalid date provided', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        searchDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(searchDate);

        nextDay.setDate(nextDay.getDate() + 1);

        const filter = { date: { $gte: searchDate, $lt: nextDay } };
        return await paginateEvents(filter, { time: 1 }, pagination);
      } catch (err) {
        logger.error(err);

        throw new GraphQLError('Error fetching events by date', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
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
        const sanitizedLocation = escapeRegex(location.trim());

        if (!sanitizedLocation) {
          throw new GraphQLError('Location is required', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        const filter = { location: { $regex: sanitizedLocation, $options: 'i' } };
        return await paginateEvents(filter, { date: 1 }, pagination);
      } catch (err) {
        logger.error(err);

        throw new GraphQLError('Error fetching events by location', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    eventsByUser: async (
      _: unknown,
      { userId, pagination }: { userId: string; pagination?: PaginationInput },
    ): Promise<EventConnection> => {
      try {
        if (!Types.ObjectId.isValid(userId)) {
          throw new GraphQLError('Invalid user id', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        const filter = { creator: userId };
        return await paginateEvents(filter, { createdAt: -1 }, pagination);
      } catch (err) {
        logger.error(err);

        throw new GraphQLError('Error fetching events by user', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    myEvents: requireAuth(
      async (_: unknown, { pagination }: { pagination?: PaginationInput }, { user }: Context) => {
        try {
          const filter = { creator: user!.id };
          return await paginateEvents(filter, { createdAt: -1 }, pagination);
        } catch (err) {
          logger.error(err);

          throw new GraphQLError('Error fetching your events', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
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
          return await paginateEvents(filter, { date: 1 }, pagination);
        } catch (err) {
          logger.error(err);

          throw new GraphQLError('Error fetching events you are attending', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
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

          void pubsub.publish(TOPICS.EVENT_CREATED, { eventCreated: result });

          return result;
        } catch (err) {
          logger.error(err);

          throw new GraphQLError('Error creating event', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
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
          const event = await findEventOrThrow(id);

          checkIsCreator(event, user!.id);

          const updatedEvent = await Event.findByIdAndUpdate(id, { ...eventInput }, { new: true });

          void pubsub.publish(TOPICS.EVENT_UPDATED, { eventUpdated: updatedEvent });

          return updatedEvent;
        } catch (err) {
          logger.error(err);
          if (err instanceof GraphQLError) {
            throw err;
          }
          throw new GraphQLError('Error updating event', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
        }
      },
    ),
    deleteEvent: requireAuth(
      async (_: unknown, { id }: { id: string }, { user, pubsub }: Context) => {
        try {
          const event = await findEventOrThrow(id);

          checkIsCreator(event, user!.id);

          await Event.findByIdAndDelete(id);

          void pubsub.publish(TOPICS.EVENT_DELETED, { eventDeleted: id });

          return true;
        } catch (err) {
          logger.error(err);
          if (err instanceof GraphQLError) {
            throw err;
          }
          throw new GraphQLError('Error deleting event', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
        }
      },
    ),
    attendEvent: requireAuth(
      async (_: unknown, { eventId }: { eventId: string }, { user, pubsub, loaders }: Context) => {
        try {
          const event = await findEventOrThrow(eventId);

          if (
            event.attendees.some((attendeeId: Types.ObjectId) => attendeeId.toString() === user!.id)
          ) {
            throw new GraphQLError('Already attending this event', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }

          if (!Types.ObjectId.isValid(user!.id)) {
            throw new GraphQLError('Invalid user id', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }

          event.attendees.push(new Types.ObjectId(user!.id));
          await event.save();

          const userData = await loaders.userLoader.load(user!.id);

          void pubsub.publish(TOPICS.USER_JOINED_EVENT, {
            userJoinedEvent: userData,
            eventId,
          });

          return event;
        } catch (err) {
          logger.error(err);
          if (err instanceof GraphQLError) {
            throw err;
          }
          throw new GraphQLError('Error attending event', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
        }
      },
    ),
    cancelAttendance: requireAuth(
      async (_: unknown, { eventId }: { eventId: string }, { user, pubsub, loaders }: Context) => {
        try {
          const event = await findEventOrThrow(eventId);

          if (
            !event.attendees.some(
              (attendeeId: Types.ObjectId) => attendeeId.toString() === user!.id,
            )
          ) {
            throw new GraphQLError('Not attending this event', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }

          const userData = await loaders.userLoader.load(user!.id);

          event.attendees = event.attendees.filter(
            (attendeeId: Types.ObjectId) => attendeeId.toString() !== user!.id,
          );
          await event.save();

          void pubsub.publish(TOPICS.USER_LEFT_EVENT, {
            userLeftEvent: userData,
            eventId,
          });

          return event;
        } catch (err) {
          logger.error(err);
          if (err instanceof GraphQLError) {
            throw err;
          }
          throw new GraphQLError('Error canceling attendance', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
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
    ): Promise<IUser | null> => {
      try {
        return await loaders.userLoader.load(parent.creator.toString());
      } catch (err) {
        logger.error(err);

        throw new GraphQLError('Error fetching creator', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
    attendees: async (
      parent: IEvent,
      _: unknown,
      { loaders }: Context,
      _info: unknown,
    ): Promise<IUser[]> => {
      try {
        return await loaders.eventAttendeesLoader.load(parent._id.toString());
      } catch (err) {
        logger.error(err);

        throw new GraphQLError('Error fetching attendees', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};
