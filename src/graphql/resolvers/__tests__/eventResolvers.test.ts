import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';

import { Event } from '../../../models/Event.js';
import { eventResolvers } from '../eventResolvers.js';

// Mock the models and auth utilities
jest.mock('../../../models/Event');
jest.mock('../../../models/User');
jest.doMock('../../../utils/auth', () => ({
  ...jest.requireActual('../../../utils/auth'),
  requireAuth: jest.fn(resolver => resolver),
}));
jest.mock('../../../utils/pagination', () => ({
  // @ts-ignore
  paginateQuery: jest.fn().mockImplementation(async (query, model, filter, pagination) => {
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

describe('Event Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query', () => {
    describe('events', () => {
      it('should return paginated events', async () => {
        // Arrange
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

        // Act
        const result = await eventResolvers.Query.events(null, {});

        // Assert
        expect(Event.find).toHaveBeenCalled();
        expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(result).toEqual({
          edges: expect.any(Array),
          pageInfo: expect.any(Object),
          totalCount: expect.any(Number),
        });
      });

      it('should handle errors', async () => {
        // Arrange
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });

        // Act & Assert
        await expect(eventResolvers.Query.events(null, {})).rejects.toThrow(
          'Error fetching events',
        );
      });
    });

    describe('event', () => {
      it('should return an event by ID', async () => {
        // Arrange
        const eventId = new mongoose.Types.ObjectId().toHexString();
        const mockEvent = { _id: eventId, title: 'Test Event' };
        const mockContext = {
          loaders: {
            eventLoader: {
              load: jest.fn().mockResolvedValue(mockEvent),
            },
          },
        };

        // Act
        const result = await eventResolvers.Query.event(null, { id: eventId }, mockContext as any);

        // Assert
        expect(mockContext.loaders.eventLoader.load).toHaveBeenCalledWith(eventId);
        expect(result).toEqual(mockEvent);
      });

      it('should throw error if event not found', async () => {
        // Arrange
        const mockContext = {
          loaders: {
            eventLoader: {
              load: jest.fn().mockResolvedValue(null),
            },
          },
        };

        // Act & Assert
        await expect(
          eventResolvers.Query.event(null, { id: '999' }, mockContext as any),
        ).rejects.toThrow('Event not found');
      });
    });

    describe('eventsByDate', () => {
      it('should return events for a specific date', async () => {
        // Arrange
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

        const date = '2023-01-01';

        // Act
        await eventResolvers.Query.eventsByDate(null, { date });

        // Assert
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
        // Arrange
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
        };

        await (eventResolvers.Query.myEvents as any)(null, {}, mockContext as any, {} as any);

        // Assert
        expect(Event.find).toHaveBeenCalledWith({ creator: '1' });
        expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });
        const mockContext = { user: { id: '1' } };
        await expect((eventResolvers.Query.myEvents as any)(null, {}, mockContext)).rejects.toThrow(
          'Error fetching your events',
        );
      });
    });

    describe('myAttendingEvents', () => {
      it('should return events the authenticated user is attending', async () => {
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });
        const mockContext = { user: { id: '1' } };

        await (eventResolvers.Query.myAttendingEvents as any)(null, {}, mockContext);

        expect(Event.find).toHaveBeenCalledWith({ attendees: '1' });
        expect(mockSort).toHaveBeenCalledWith({ date: 1 });
      });

      it('should handle errors', async () => {
        (Event.find as jest.Mock).mockImplementation(() => {
          throw new Error('Database error');
        });
        const mockContext = { user: { id: '1' } };
        await expect(
          (eventResolvers.Query.myAttendingEvents as any)(null, {}, mockContext),
        ).rejects.toThrow('Error fetching events you are attending');
      });
    });
  });

  describe('Mutation', () => {
    describe('createEvent', () => {
      it('should create a new event', async () => {
        // Arrange
        const eventInput = {
          title: 'New Event',
          description: 'Event Description',
          date: '2023-01-01',
          time: '14:00',
          location: 'Test Location',
        };

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
          pubsub: {
            publish: jest.fn(),
          },
        };

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

        const result = await (eventResolvers.Mutation.createEvent as any)(
          null,
          { eventInput },
          mockContext as any,
          {} as any,
        );

        // Assert
        expect(Event).toHaveBeenCalledWith({
          ...eventInput,
          creator: '1',
          attendees: [],
        });
        expect(mockSave).toHaveBeenCalled();
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
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
        const mockContext = { user: { id: '1' }, pubsub: { publish: jest.fn() } };
        await expect(
          (eventResolvers.Mutation.createEvent as any)(null, { eventInput: {} }, mockContext),
        ).rejects.toThrow('Error creating event');
      });
    });

    describe('updateEvent', () => {
      it('should update an existing event', async () => {
        // Arrange
        const eventInput = {
          title: 'Updated Event',
          description: 'Updated Description',
          date: '2023-01-02',
          time: '15:00',
          location: 'Updated Location',
        };

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

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
          pubsub: {
            publish: jest.fn(),
          },
        };

        // Mock Event.findById
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        // Mock Event.findByIdAndUpdate
        (Event.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedEvent);

        const result = await (eventResolvers.Mutation.updateEvent as any)(
          null,
          { id: eventId, eventInput },
          mockContext as any,
          {} as any,
        );

        // Assert
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
        // Arrange
        const eventInput = { title: 'Updated Event' };
        const mockContext = { user: { id: '1' } };
        (Event.findById as jest.Mock).mockResolvedValue(null);

        await expect(
          (eventResolvers.Mutation.updateEvent as any)(
            null,
            { id: '999', eventInput },
            mockContext,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error for invalid event ID', async () => {
        const mockContext = { user: { id: '1' } };
        await expect(
          (eventResolvers.Mutation.updateEvent as any)(
            null,
            { id: 'invalid-id', eventInput: {} },
            mockContext,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if user is not the creator', async () => {
        // Arrange
        const eventInput = { title: 'Updated Event' };
        const mockEvent = { id: '1', creator: { toString: () => '2' } };
        const mockContext = { user: { id: '1' } };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        await expect(
          (eventResolvers.Mutation.updateEvent as any)(null, { id: '1', eventInput }, mockContext),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        const mockContext = { user: { id: '1' } };
        await expect(
          (eventResolvers.Mutation.updateEvent as any)(
            null,
            { id: new mongoose.Types.ObjectId().toHexString(), eventInput: {} },
            mockContext,
          ),
        ).rejects.toThrow('Some other error');
      });
    });

    describe('deleteEvent', () => {
      const eventId = new mongoose.Types.ObjectId().toHexString();
      const mockContext = { user: { id: '1' }, pubsub: { publish: jest.fn() } };

      it('should delete an event successfully', async () => {
        const mockEvent = { creator: { toString: () => '1' } };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
        (Event.findByIdAndDelete as jest.Mock).mockResolvedValue(true);

        const result = await (eventResolvers.Mutation.deleteEvent as any)(
          null,
          { id: eventId },
          mockContext,
        );

        expect(Event.findById).toHaveBeenCalledWith(eventId);
        expect(Event.findByIdAndDelete).toHaveBeenCalledWith(eventId);
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error for invalid event ID', async () => {
        await expect(
          (eventResolvers.Mutation.deleteEvent as any)(null, { id: 'invalid-id' }, mockContext),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if event not found', async () => {
        (Event.findById as jest.Mock).mockResolvedValue(null);
        await expect(
          (eventResolvers.Mutation.deleteEvent as any)(null, { id: eventId }, mockContext),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if user is not the creator', async () => {
        const mockEvent = { creator: { toString: () => '2' } };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
        await expect(
          (eventResolvers.Mutation.deleteEvent as any)(null, { id: eventId }, mockContext),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        await expect(
          (eventResolvers.Mutation.deleteEvent as any)(null, { id: eventId }, mockContext),
        ).rejects.toThrow('Some other error');
      });
    });

    describe('attendEvent', () => {
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

        const mockUser = { _id: '1', name: 'Test User' };
        const mockContext = {
          user: { id: '1' },
          pubsub: { publish: jest.fn() },
          loaders: { userLoader: { load: jest.fn().mockResolvedValue(mockUser) } },
        };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        const result = await (eventResolvers.Mutation.attendEvent as any)(
          null,
          { eventId },
          mockContext,
        );

        // Assert
        expect(Event.findById).toHaveBeenCalledWith(eventId);
        expect(mockEvent.attendees).toHaveLength(1);
        expect(mockSave).toHaveBeenCalled();
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
        expect(result).toBe(mockEvent);
      });

      it('should throw error if already attending', async () => {
        // Arrange
        const mockEvent = { attendees: ['1'] };
        const mockContext = { user: { id: '1' } };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        await expect(
          (eventResolvers.Mutation.attendEvent as any)(
            null,
            { eventId: '1' },
            mockContext,
            {} as any,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error for invalid event ID', async () => {
        const mockContext = { user: { id: '1' } };
        await expect(
          (eventResolvers.Mutation.attendEvent as any)(null, { eventId: 'invalid' }, mockContext),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if event not found', async () => {
        (Event.findById as jest.Mock).mockResolvedValue(null);
        const mockContext = { user: { id: '1' } };
        await expect(
          (eventResolvers.Mutation.attendEvent as any)(
            null,
            { eventId: new mongoose.Types.ObjectId().toHexString() },
            mockContext,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        const mockContext = { user: { id: '1' } };
        await expect(
          (eventResolvers.Mutation.attendEvent as any)(
            null,
            { eventId: new mongoose.Types.ObjectId().toHexString() },
            mockContext,
          ),
        ).rejects.toThrow('Some other error');
      });
    });

    describe('cancelAttendance', () => {
      const eventId = new mongoose.Types.ObjectId().toHexString();
      const mockUser = { _id: '1', name: 'Test User' };
      const mockContext = {
        user: { id: '1' },
        pubsub: { publish: jest.fn() },
        loaders: { userLoader: { load: jest.fn().mockResolvedValue(mockUser) } },
      };

      it('should cancel attendance successfully', async () => {
        const mockSave = jest.fn().mockResolvedValue(true);
        const mockEvent = { attendees: ['1', '2'], save: mockSave };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        const result = await (eventResolvers.Mutation.cancelAttendance as any)(
          null,
          { eventId },
          mockContext,
        );

        expect(result.attendees).toEqual(['2']);
        expect(mockSave).toHaveBeenCalled();
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
      });

      it('should throw error for invalid event ID', async () => {
        await expect(
          (eventResolvers.Mutation.cancelAttendance as any)(
            null,
            { eventId: 'invalid' },
            mockContext,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if event not found', async () => {
        (Event.findById as jest.Mock).mockResolvedValue(null);
        await expect(
          (eventResolvers.Mutation.cancelAttendance as any)(null, { eventId }, mockContext),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if user is not attending', async () => {
        const mockEvent = { attendees: ['2', '3'] };
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
        await expect(
          (eventResolvers.Mutation.cancelAttendance as any)(null, { eventId }, mockContext),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw a generic error for other issues', async () => {
        (Event.findById as jest.Mock).mockRejectedValue(new Error('Some other error'));
        await expect(
          (eventResolvers.Mutation.cancelAttendance as any)(null, { eventId }, mockContext),
        ).rejects.toThrow('Some other error');
      });
    });
  });

  describe('Event', () => {
    describe('creator', () => {
      it('should return the creator of the event', async () => {
        // Arrange
        const parent = {
          creator: { toString: () => '1' },
        };
        const mockUser = { id: '1', name: 'Test User' };
        const mockContext = {
          loaders: {
            userLoader: {
              load: jest.fn().mockResolvedValue(mockUser),
            },
          },
        };

        // Act
        const result = await eventResolvers.Event.creator(
          parent as any,
          {},
          mockContext as any,
          {},
        );

        // Assert
        expect(mockContext.loaders.userLoader.load).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockUser);
      });

      it('should handle errors', async () => {
        const parent = { creator: { toString: () => '1' } };
        const mockContext = {
          loaders: { userLoader: { load: jest.fn().mockRejectedValue(new Error('DB Error')) } },
        };
        await expect(
          eventResolvers.Event.creator(parent as any, {}, mockContext as any, {}),
        ).rejects.toThrow('Error fetching creator');
      });
    });

    describe('attendees', () => {
      it('should return the attendees of the event', async () => {
        // Arrange
        const parent = { _id: '1' };
        const mockAttendees = [{ id: '1', name: 'Test User' }];
        const mockContext = {
          loaders: {
            eventAttendeesLoader: {
              load: jest.fn().mockResolvedValue(mockAttendees),
            },
          },
        };

        // Act
        const result = await eventResolvers.Event.attendees(
          parent as any,
          {},
          mockContext as any,
          {},
        );

        // Assert
        expect(mockContext.loaders.eventAttendeesLoader.load).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockAttendees);
      });

      it('should handle errors', async () => {
        const parent = { _id: '1' };
        const mockContext = {
          loaders: {
            eventAttendeesLoader: {
              load: jest.fn().mockRejectedValue(new Error('DB Error')),
            },
          },
        };
        await expect(
          eventResolvers.Event.attendees(parent as any, {}, mockContext as any, {}),
        ).rejects.toThrow('Error fetching attendees');
      });
    });
  });
});
