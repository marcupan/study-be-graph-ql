import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';

import { Event } from '../../../models/Event.js';
import type { IEvent } from '../../../models/Event.js';
import type { IUser } from '../../../models/User.js';
import type { Loaders } from '../../../utils/dataLoaders.js';
import { eventResolvers } from '../eventResolvers.js';

jest.mock('../../../models/Event');
jest.mock('../../../models/User');
jest.doMock('../../../utils/auth', () => ({
  ...jest.requireActual('../../../utils/auth'),
  requireAuth: jest.fn(resolver => resolver),
}));
jest.mock('../../../utils/pagination', () => ({
  paginateQuery: jest.fn().mockImplementation(async () => {
    return {
      edges: [{ id: '1', title: 'Test Event' }],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 1,
      },
      totalCount: 1,
    };
  }),
}));

type EventContext = Parameters<typeof eventResolvers.Query.event>[2];
type LoadFn<T> = jest.MockedFunction<(key: string) => Promise<T>>;
type CreateEventArgs = Parameters<typeof eventResolvers.Mutation.createEvent>[1];

type ContextWithMocks = EventContext & {
  mocks: {
    eventLoaderLoad: LoadFn<IEvent | null>;
    userLoaderLoad: LoadFn<IUser | null>;
    eventAttendeesLoaderLoad: LoadFn<IUser[]>;
    userEventsLoaderLoad: LoadFn<IEvent[]>;
    userAttendingEventsLoaderLoad: LoadFn<IEvent[]>;
  };
};

const createEventInput = (
  overrides: Partial<CreateEventArgs['eventInput']> = {},
): CreateEventArgs['eventInput'] => ({
  title: 'Test Event',
  description: 'Event Description',
  date: '2023-01-01',
  time: '14:00',
  location: 'Test Location',
  ...overrides,
});

const createContext = (overrides: Partial<EventContext> = {}): ContextWithMocks => {
  const eventLoaderLoad: LoadFn<IEvent | null> = jest.fn();
  const userLoaderLoad: LoadFn<IUser | null> = jest.fn();
  const eventAttendeesLoaderLoad: LoadFn<IUser[]> = jest.fn();
  const userEventsLoaderLoad: LoadFn<IEvent[]> = jest.fn();
  const userAttendingEventsLoaderLoad: LoadFn<IEvent[]> = jest.fn();

  const loaders = {
    eventLoader: { load: eventLoaderLoad } as unknown as Loaders['eventLoader'],
    userLoader: { load: userLoaderLoad } as unknown as Loaders['userLoader'],
    eventAttendeesLoader: {
      load: eventAttendeesLoaderLoad,
    } as unknown as Loaders['eventAttendeesLoader'],
    userEventsLoader: { load: userEventsLoaderLoad } as unknown as Loaders['userEventsLoader'],
    userAttendingEventsLoader: {
      load: userAttendingEventsLoaderLoad,
    } as unknown as Loaders['userAttendingEventsLoader'],
  } as Loaders;

  const pubsub = { publish: jest.fn() } as unknown as EventContext['pubsub'];

  return {
    user: { id: '1', email: 'test@example.com' },
    loaders,
    pubsub,
    ...overrides,
    mocks: {
      eventLoaderLoad,
      userLoaderLoad,
      eventAttendeesLoaderLoad,
      userEventsLoaderLoad,
      userAttendingEventsLoaderLoad,
    },
  };
};

describe('Event Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query', () => {
    describe('events', () => {
      it('should return paginated events', async () => {
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

        const result = await eventResolvers.Query.events(null, {});

        expect(Event.find).toHaveBeenCalled();
        expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(result).toEqual({
          edges: expect.any(Array),
          pageInfo: expect.any(Object),
          totalCount: expect.any(Number),
        });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });

        await expect(eventResolvers.Query.events(null, {})).rejects.toThrow(
          'Error fetching events',
        );
      });
    });

    describe('event', () => {
      it('should return an event by ID', async () => {
        const eventId = new mongoose.Types.ObjectId().toHexString();
        const mockEvent = { _id: eventId, title: 'Test Event' } as unknown as IEvent;
        const mockContext = createContext();
        mockContext.mocks.eventLoaderLoad.mockResolvedValue(mockEvent);

        const result = await eventResolvers.Query.event(null, { id: eventId }, mockContext);

        expect(mockContext.mocks.eventLoaderLoad).toHaveBeenCalledWith(eventId);
        expect(result).toEqual(mockEvent);
      });

      it('should return null if event not found', async () => {
        const mockContext = createContext();
        mockContext.mocks.eventLoaderLoad.mockResolvedValue(null);

        const result = await eventResolvers.Query.event(null, { id: '999' }, mockContext);

        expect(result).toBeNull();
      });
    });

    describe('eventsByDate', () => {
      it('should return events for a specific date', async () => {
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

        const date = '2023-01-01';

        await eventResolvers.Query.eventsByDate(null, { date });

        expect(Event.find).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.any(Object),
          }),
        );
        expect(mockSort).toHaveBeenCalledWith({ time: 1 });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });
        await expect(
          eventResolvers.Query.eventsByDate(null, { date: '2023-01-01' }),
        ).rejects.toThrow('Error fetching events by date');
      });
    });

    describe('eventsByLocation', () => {
      it('should return events for a specific location', async () => {
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });
        const location = 'Test Location';

        await eventResolvers.Query.eventsByLocation(null, { location });

        expect(Event.find).toHaveBeenCalledWith({
          location: { $regex: location, $options: 'i' },
        });
        expect(mockSort).toHaveBeenCalledWith({ date: 1 });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });
        await expect(
          eventResolvers.Query.eventsByLocation(null, { location: 'Test Location' }),
        ).rejects.toThrow('Error fetching events by location');
      });
    });

    describe('eventsByUser', () => {
      it('should return events for a specific user', async () => {
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });
        const userId = new mongoose.Types.ObjectId().toHexString();

        await eventResolvers.Query.eventsByUser(null, { userId });

        expect(Event.find).toHaveBeenCalledWith({ creator: userId });
        expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });
        await expect(
          eventResolvers.Query.eventsByUser(null, {
            userId: new mongoose.Types.ObjectId().toHexString(),
          }),
        ).rejects.toThrow('Error fetching events by user');
      });
    });

    describe('myEvents', () => {
      it('should return events created by the authenticated user', async () => {
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });

        await eventResolvers.Query.myEvents(null, {}, mockContext, undefined);

        expect(Event.find).toHaveBeenCalledWith({ creator: '1' });
        expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        await expect(
          eventResolvers.Query.myEvents(null, {}, mockContext, undefined),
        ).rejects.toThrow('Error fetching your events');
      });
    });

    describe('myAttendingEvents', () => {
      it('should return events the authenticated user is attending', async () => {
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });

        await eventResolvers.Query.myAttendingEvents(null, {}, mockContext, undefined);

        expect(Event.find).toHaveBeenCalledWith({ attendees: '1' });
        expect(mockSort).toHaveBeenCalledWith({ date: 1 });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        await expect(
          eventResolvers.Query.myAttendingEvents(null, {}, mockContext, undefined),
        ).rejects.toThrow('Error fetching events you are attending');
      });
    });
  });

  describe('Mutation', () => {
    describe('createEvent', () => {
      it('should create a new event', async () => {
        // Arrange
        const eventInput = createEventInput({ title: 'New Event' });

        const fullContext = createContext({ user: { id: '1', email: 'test@example.com' } });

        // Mock Event constructor and save
        const mockSave = jest.fn().mockResolvedValue({
          id: '1',
          ...eventInput,
          creator: '1',
          attendees: [],
        });
        (Event as unknown as jest.Mock).mockImplementation(() => ({
          save: mockSave,
        }));

        const result = await eventResolvers.Mutation.createEvent(
          null,
          { eventInput },
          fullContext,
          undefined,
        );

        // Assert
        expect(Event).toHaveBeenCalledWith({
          ...eventInput,
          creator: '1',
          attendees: [],
        });
        expect(mockSave).toHaveBeenCalled();
        expect(fullContext.pubsub.publish).toHaveBeenCalled();
        expect(result).toEqual({
          id: '1',
          ...eventInput,
          creator: '1',
          attendees: [],
        });
      });

      it('should handle errors', async () => {
        (Event as unknown as jest.Mock).mockImplementation(() => ({
          save: jest.fn().mockRejectedValue(new Error('DB error')),
        }));
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        await expect(
          eventResolvers.Mutation.createEvent(
            null,
            { eventInput: {} as unknown as CreateEventArgs['eventInput'] },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow('Error creating event');
      });
    });

    describe('updateEvent', () => {
      it('should update an existing event', async () => {
        // Arrange
        const eventInput = createEventInput({
          title: 'Updated Event',
          description: 'Updated Description',
          date: '2023-01-02',
          time: '15:00',
          location: 'Updated Location',
        });

        const eventId = new mongoose.Types.ObjectId().toHexString();
        const mockEvent = {
          _id: eventId,
          title: 'Original Event',
          creator: { toString: () => '1' },
        };

        const mockUpdatedEvent = {
          _id: eventId,
          ...eventInput,
          creator: '1',
        };

        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });

        // Mock Event.findById
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        // Mock Event.findByIdAndUpdate
        (Event.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedEvent);

        const result = await eventResolvers.Mutation.updateEvent(
          null,
          { id: eventId, eventInput },
          mockContext,
          undefined,
        );

        expect(Event.findById).toHaveBeenCalledWith(eventId);
        expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
          eventId,
          { ...eventInput },
          { new: true },
        );
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
        expect(result).toEqual(mockUpdatedEvent);
      });

      it('should throw error if event not found', async () => {
        const eventInput = createEventInput({ title: 'Updated Event' });
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        (Event.findById as jest.Mock).mockResolvedValue(null);

        await expect(
          eventResolvers.Mutation.updateEvent(
            null,
            { id: '999', eventInput },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error for invalid event ID', async () => {
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        await expect(
          eventResolvers.Mutation.updateEvent(
            null,
            { id: 'invalid-id', eventInput: createEventInput() },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if user is not the creator', async () => {
        const eventInput = createEventInput({ title: 'Updated Event' });
        const mockEvent = { id: '1', creator: { toString: () => '2' } };
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        await expect(
          eventResolvers.Mutation.updateEvent(
            null,
            { id: '1', eventInput },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
        await expect(
          eventResolvers.Mutation.updateEvent(
            null,
            { id: new mongoose.Types.ObjectId().toHexString(), eventInput: createEventInput() },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow('Error updating event');
      });
    });

    describe('deleteEvent', () => {
      const eventId = new mongoose.Types.ObjectId().toHexString();
      const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });

      it('should delete an event successfully', async () => {
        const mockEvent = { creator: { toString: () => '1' } };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
        (Event.findByIdAndDelete as jest.Mock).mockResolvedValue(true);

        const result = await eventResolvers.Mutation.deleteEvent(
          null,
          { id: eventId },
          mockContext,
          undefined,
        );

        expect(Event.findById).toHaveBeenCalledWith(eventId);
        expect(Event.findByIdAndDelete).toHaveBeenCalledWith(eventId);
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error for invalid event ID', async () => {
        await expect(
          eventResolvers.Mutation.deleteEvent(null, { id: 'invalid-id' }, mockContext, undefined),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if event not found', async () => {
        (Event.findById as jest.Mock).mockResolvedValue(null);
        await expect(
          eventResolvers.Mutation.deleteEvent(null, { id: eventId }, mockContext, undefined),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if user is not the creator', async () => {
        const mockEvent = { creator: { toString: () => '2' } };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
        await expect(
          eventResolvers.Mutation.deleteEvent(null, { id: eventId }, mockContext, undefined),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        await expect(
          eventResolvers.Mutation.deleteEvent(null, { id: eventId }, mockContext, undefined),
        ).rejects.toThrow('Error deleting event');
      });
    });

    describe('attendEvent', () => {
      const userId = new mongoose.Types.ObjectId().toHexString();

      it('should add user to event attendees', async () => {
        // Arrange
        const eventId = new mongoose.Types.ObjectId().toHexString();
        const mockSave = jest.fn().mockResolvedValue({
          _id: eventId,
          title: 'Test Event',
          attendees: ['1'],
        });
        const mockEvent = {
          _id: eventId,
          title: 'Test Event',
          attendees: [],
          save: mockSave,
        };

        const mockUser = { _id: userId, name: 'Test User' } as unknown as IUser;
        const mockContext = createContext({ user: { id: userId, email: 'test@example.com' } });
        mockContext.mocks.userLoaderLoad.mockResolvedValue(mockUser);
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        const result = await eventResolvers.Mutation.attendEvent(
          null,
          { eventId },
          mockContext,
          undefined,
        );

        expect(Event.findById).toHaveBeenCalledWith(eventId);
        expect(mockEvent.attendees).toHaveLength(1);
        expect(mockSave).toHaveBeenCalled();
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
        expect(result).toBe(mockEvent);
      });

      it('should throw error if already attending', async () => {
        const mockEvent = { attendees: [userId] };
        const mockContext = createContext({ user: { id: userId, email: 'test@example.com' } });
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        await expect(
          eventResolvers.Mutation.attendEvent(null, { eventId: '1' }, mockContext, undefined),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error for invalid event ID', async () => {
        const mockContext = createContext({ user: { id: userId, email: 'test@example.com' } });
        await expect(
          eventResolvers.Mutation.attendEvent(null, { eventId: 'invalid' }, mockContext, undefined),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if event not found', async () => {
        (Event.findById as jest.Mock).mockResolvedValue(null);
        const mockContext = createContext({ user: { id: userId, email: 'test@example.com' } });
        await expect(
          eventResolvers.Mutation.attendEvent(
            null,
            { eventId: new mongoose.Types.ObjectId().toHexString() },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        const mockContext = createContext({ user: { id: userId, email: 'test@example.com' } });
        await expect(
          eventResolvers.Mutation.attendEvent(
            null,
            { eventId: new mongoose.Types.ObjectId().toHexString() },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow('Error attending event');
      });
    });

    describe('cancelAttendance', () => {
      const eventId = new mongoose.Types.ObjectId().toHexString();
      const mockUser = { _id: '1', name: 'Test User' } as unknown as IUser;
      const mockContext = createContext({ user: { id: '1', email: 'test@example.com' } });
      mockContext.mocks.userLoaderLoad.mockResolvedValue(mockUser);

      it('should cancel attendance successfully', async () => {
        const mockSave = jest.fn().mockResolvedValue(true);
        const mockEvent = { attendees: ['1', '2'], save: mockSave };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        const result = (await eventResolvers.Mutation.cancelAttendance(
          null,
          { eventId },
          mockContext,
          undefined,
        )) as IEvent;

        expect(result.attendees).toEqual(['2']);
        expect(mockSave).toHaveBeenCalled();
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
      });

      it('should throw error for invalid event ID', async () => {
        await expect(
          eventResolvers.Mutation.cancelAttendance(
            null,
            { eventId: 'invalid' },
            mockContext,
            undefined,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if event not found', async () => {
        (Event.findById as jest.Mock).mockResolvedValue(null);
        await expect(
          eventResolvers.Mutation.cancelAttendance(null, { eventId }, mockContext, undefined),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if user is not attending', async () => {
        const mockEvent = { attendees: ['2', '3'] };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
        await expect(
          eventResolvers.Mutation.cancelAttendance(null, { eventId }, mockContext, undefined),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        await expect(
          eventResolvers.Mutation.cancelAttendance(null, { eventId }, mockContext, undefined),
        ).rejects.toThrow('Error canceling attendance');
      });
    });
  });

  describe('Event', () => {
    describe('creator', () => {
      it('should return the creator of the event', async () => {
        const parent: Parameters<typeof eventResolvers.Event.creator>[0] = {
          creator: { toString: () => '1' },
        } as Parameters<typeof eventResolvers.Event.creator>[0];
        const mockUser = { id: '1', name: 'Test User' } as unknown as IUser;
        const mockContext = createContext();
        mockContext.mocks.userLoaderLoad.mockResolvedValue(mockUser);

        const result = await eventResolvers.Event.creator(parent, {}, mockContext, {});

        expect(mockContext.mocks.userLoaderLoad).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockUser);
      });

      it('should handle errors', async () => {
        const parent: Parameters<typeof eventResolvers.Event.creator>[0] = {
          creator: { toString: () => '1' },
        } as Parameters<typeof eventResolvers.Event.creator>[0];
        const mockContext = createContext();
        mockContext.mocks.userLoaderLoad.mockRejectedValue(new Error('DB Error'));
        await expect(eventResolvers.Event.creator(parent, {}, mockContext, {})).rejects.toThrow(
          'Error fetching creator',
        );
      });
    });

    describe('attendees', () => {
      it('should return the attendees of the event', async () => {
        const parent: Parameters<typeof eventResolvers.Event.attendees>[0] = {
          _id: new mongoose.Types.ObjectId(),
        } as Parameters<typeof eventResolvers.Event.attendees>[0];
        const mockAttendees = [{ id: '1', name: 'Test User' }] as unknown as IUser[];
        const mockContext = createContext();
        mockContext.mocks.eventAttendeesLoaderLoad.mockResolvedValue(mockAttendees);

        const result = await eventResolvers.Event.attendees(parent, {}, mockContext, {});

        expect(mockContext.mocks.eventAttendeesLoaderLoad).toHaveBeenCalledWith(
          parent._id.toString(),
        );
        expect(result).toEqual(mockAttendees);
      });

      it('should handle errors', async () => {
        const parent: Parameters<typeof eventResolvers.Event.attendees>[0] = {
          _id: new mongoose.Types.ObjectId(),
        } as Parameters<typeof eventResolvers.Event.attendees>[0];
        const mockContext = createContext();
        mockContext.mocks.eventAttendeesLoaderLoad.mockRejectedValue(new Error('DB Error'));
        await expect(eventResolvers.Event.attendees(parent, {}, mockContext, {})).rejects.toThrow(
          'Error fetching attendees',
        );
      });
    });
  });
});
