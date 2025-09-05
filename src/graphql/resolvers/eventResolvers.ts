import {IEvent, Event} from '../../models/Event';
import {User} from '../../models/User';
import {requireAuth} from '../../utils/auth';
import {UserInputError, ForbiddenError} from 'apollo-server-express';
import {paginateQuery} from '../../utils/pagination';
import {Loaders} from '../../utils/dataLoaders';
import { PubSub } from 'graphql-subscriptions';
import { TOPICS } from './subscriptionResolvers';

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
        events: async (_: any, { pagination }: { pagination?: PaginationInput }) => {
            try {
                const query = Event.find().sort({createdAt: -1});
                return await paginateQuery(query, Event, {}, pagination);
            } catch (err) {
                throw new Error('Error fetching events');
            }
        },
        event: async (_: any, {id}: { id: string }, { loaders }: Context) => {
            try {
                const event = await loaders.eventLoader.load(id);
                if (!event) {
                    throw new Error('Event not found');
                }
                return event;
            } catch (err) {
                throw new Error('Event not found');
            }
        },
        eventsByDate: async (_: any, {date, pagination}: { date: string, pagination?: PaginationInput }) => {
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
                        $lt: nextDay
                    }
                };

                const query = Event.find(filter).sort({time: 1});
                return await paginateQuery(query, Event, filter, pagination);
            } catch (err) {
                throw new Error('Error fetching events by date');
            }
        },
        eventsByLocation: async (_: any, {location, pagination}: { location: string, pagination?: PaginationInput }) => {
            try {
                // Case-insensitive search for location
                const filter = {
                    location: {$regex: location, $options: 'i'}
                };

                const query = Event.find(filter).sort({date: 1});
                return await paginateQuery(query, Event, filter, pagination);
            } catch (err) {
                throw new Error('Error fetching events by location');
            }
        },
        eventsByUser: async (_: any, {userId, pagination}: { userId: string, pagination?: PaginationInput }) => {
            try {
                const filter = {creator: userId};
                const query = Event.find(filter).sort({createdAt: -1});
                return await paginateQuery(query, Event, filter, pagination);
            } catch (err) {
                throw new Error('Error fetching events by user');
            }
        },
        myEvents: requireAuth(async (_: any, { pagination }: { pagination?: PaginationInput }, {user}: Context) => {
            try {
                const filter = {creator: user!.id};
                const query = Event.find(filter).sort({createdAt: -1});
                return await paginateQuery(query, Event, filter, pagination);
            } catch (err) {
                throw new Error('Error fetching your events');
            }
        }),
        myAttendingEvents: requireAuth(async (_: any, { pagination }: { pagination?: PaginationInput }, {user}: Context) => {
            try {
                const filter = {attendees: user!.id};
                const query = Event.find(filter).sort({date: 1});
                return await paginateQuery(query, Event, filter, pagination);
            } catch (err) {
                throw new Error('Error fetching events you are attending');
            }
        }),
    },
    Mutation: {
        createEvent: requireAuth(async (_: any, {eventInput}: { eventInput: EventInput }, {user, pubsub}: Context) => {
            try {
                const event = new Event({
                    ...eventInput,
                    creator: user!.id,
                    attendees: [],
                });

                const result = await event.save();

                // Publish the event creation for subscriptions
                pubsub.publish(TOPICS.EVENT_CREATED, { eventCreated: result });

                return result;
            } catch (err) {
                throw new Error('Error creating event');
            }
        }),
        updateEvent: requireAuth(async (_: any, {id, eventInput}: {
            id: string;
            eventInput: EventInput
        }, {user, pubsub}: Context) => {
            try {
                // Find the event
                const event = await Event.findById(id);
                if (!event) {
                    throw new UserInputError('Event not found');
                }

                // Check if the user is the creator of the event
                if (event.creator.toString() !== user!.id) {
                    throw new ForbiddenError('Not authorized to update this event');
                }

                // Update the event
                const updatedEvent = await Event.findByIdAndUpdate(
                    id,
                    {...eventInput},
                    {new: true}
                );

                // Publish the event update for subscriptions
                pubsub.publish(TOPICS.EVENT_UPDATED, { eventUpdated: updatedEvent });

                return updatedEvent;
            } catch (err) {
                throw err;
            }
        }),
        deleteEvent: requireAuth(async (_: any, {id}: { id: string }, {user, pubsub}: Context) => {
            try {
                // Find the event
                const event = await Event.findById(id);
                if (!event) {
                    throw new UserInputError('Event not found');
                }

                // Check if the user is the creator of the event
                if (event.creator.toString() !== user!.id) {
                    throw new ForbiddenError('Not authorized to delete this event');
                }

                // Delete the event
                await Event.findByIdAndDelete(id);

                // Publish the event deletion for subscriptions
                pubsub.publish(TOPICS.EVENT_DELETED, { eventDeleted: id });

                return true;
            } catch (err) {
                throw err;
            }
        }),
        attendEvent: requireAuth(async (_: any, {eventId}: { eventId: string }, {user, pubsub, loaders}: Context) => {
            try {
                // Find the event
                const event = await Event.findById(eventId);
                if (!event) {
                    throw new UserInputError('Event not found');
                }

                // Check if user is already attending
                if (event.attendees.includes(user!.id as any)) {
                    throw new UserInputError('Already attending this event');
                }

                // Add user to attendees
                event.attendees.push(user!.id as any);
                await event.save();

                // Get the user data for the subscription
                const userData = await loaders.userLoader.load(user!.id);

                // Publish the user joined event for subscriptions
                pubsub.publish(TOPICS.USER_JOINED_EVENT, {
                    userJoinedEvent: userData,
                    eventId: eventId
                });

                return event;
            } catch (err) {
                throw err;
            }
        }),
        cancelAttendance: requireAuth(async (_: any, {eventId}: { eventId: string }, {user, pubsub, loaders}: Context) => {
            try {
                // Find the event
                const event = await Event.findById(eventId);
                if (!event) {
                    throw new UserInputError('Event not found');
                }

                // Check if user is attending
                if (!event.attendees.includes(user!.id as any)) {
                    throw new UserInputError('Not attending this event');
                }

                // Get the user data for the subscription before removing from attendees
                const userData = await loaders.userLoader.load(user!.id);

                // Remove user from attendees
                event.attendees = event.attendees.filter(
                    (attendeeId) => attendeeId.toString() !== user!.id
                );
                await event.save();

                // Publish the user left event for subscriptions
                pubsub.publish(TOPICS.USER_LEFT_EVENT, {
                    userLeftEvent: userData,
                    eventId: eventId
                });

                return event;
            } catch (err) {
                throw err;
            }
        }),
    },
    Event: {
        creator: async (parent: IEvent, _: any, { loaders }: Context) => {
            try {
                return await loaders.userLoader.load(parent.creator.toString());
            } catch (err) {
                throw new Error('Error fetching creator');
            }
        },
        attendees: async (parent: IEvent, _: any, { loaders }: Context) => {
            try {
                return await loaders.eventAttendeesLoader.load(parent.id);
            } catch (err) {
                throw new Error('Error fetching attendees');
            }
        },
    },
};
