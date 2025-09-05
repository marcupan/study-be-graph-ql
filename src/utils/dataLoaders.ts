import DataLoader from 'dataloader';
import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { Event, IEvent } from '../models/Event';

/**
 * Create DataLoader instances for User and Event models
 * DataLoader batches and caches database requests to improve performance
 */
export const createLoaders = () => {
  /**
   * User loader - batches and caches User lookups by ID
   */
  const userLoader = new DataLoader<string, IUser | null>(async (userIds) => {
    // Convert string IDs to ObjectIds
    const objectIds = userIds.map(id => new Types.ObjectId(id));

    // Fetch all users in a single query
    const users = await User.find({ _id: { $in: objectIds } });

    // Map the results to match the order of the input IDs
    return userIds.map(id =>
      users.find(user => user._id.toString() === id) || null
    );
  });

  /**
   * Event loader - batches and caches Event lookups by ID
   */
  const eventLoader = new DataLoader<string, IEvent | null>(async (eventIds) => {
    // Convert string IDs to ObjectIds
    const objectIds = eventIds.map(id => new Types.ObjectId(id));

    // Fetch all events in a single query
    const events = await Event.find({ _id: { $in: objectIds } });

    // Map the results to match the order of the input IDs
    return eventIds.map(id =>
      events.find(event => event._id.toString() === id) || null
    );
  });

  /**
   * User events loader - batches and caches queries for events created by a user
   */
  const userEventsLoader = new DataLoader<string, IEvent[]>(async (userIds) => {
    // Convert string IDs to ObjectIds
    const objectIds = userIds.map(id => new Types.ObjectId(id));

    // Fetch all events for all users in a single query
    const events = await Event.find({ creator: { $in: objectIds } });

    // Group events by creator ID
    return userIds.map(userId =>
      events.filter(event => event.creator.toString() === userId)
    );
  });

  /**
   * User attending events loader - batches and caches queries for events a user is attending
   */
  const userAttendingEventsLoader = new DataLoader<string, IEvent[]>(async (userIds) => {
    // Convert string IDs to ObjectIds
    const objectIds = userIds.map(id => new Types.ObjectId(id));

    // Fetch all events where any of these users are attendees
    const events = await Event.find({ attendees: { $in: objectIds } });

    // Group events by attendee ID
    return userIds.map(userId =>
      events.filter(event =>
        event.attendees.some(attendeeId => attendeeId.toString() === userId)
      )
    );
  });

  /**
   * Event attendees loader - batches and caches queries for users attending an event
   */
  const eventAttendeesLoader = new DataLoader<string, IUser[]>(async (eventIds) => {
    // Convert string IDs to ObjectIds
    const objectIds = eventIds.map(id => new Types.ObjectId(id));

    // Fetch all events to get attendee IDs
    const events = await Event.find({ _id: { $in: objectIds } });

    // Extract all unique attendee IDs
    const allAttendeeIds = new Set<string>();
    events.forEach(event => {
      event.attendees.forEach(attendeeId => {
        allAttendeeIds.add(attendeeId.toString());
      });
    });

    // Fetch all attendees in a single query
    const attendees = await User.find({
      _id: { $in: Array.from(allAttendeeIds).map(id => new Types.ObjectId(id)) }
    });

    // Map the results to match the order of the input event IDs
    const result = eventIds.map(eventId => {
      const event = events.find(e => e._id.toString() === eventId);
      if (!event) return [];

      // Filter out undefined values and cast to IUser[]
      const eventAttendees = event.attendees
        .map(attendeeId =>
          attendees.find(user => user._id.toString() === attendeeId.toString())
        )
        .filter((user): user is NonNullable<typeof user> => user !== undefined) as IUser[];

      return eventAttendees;
    });

    return result;
  });

  return {
    userLoader,
    eventLoader,
    userEventsLoader,
    userAttendingEventsLoader,
    eventAttendeesLoader
  };
};

// Define the type for the context with loaders
export type Loaders = ReturnType<typeof createLoaders>;
