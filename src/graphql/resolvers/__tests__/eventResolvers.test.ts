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
        const mockFind = jest.fn().mockReturnThis();
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = mockFind;
        mockFind.mockReturnValue({ sort: mockSort });

        // Act
        const result = await eventResolvers.Query.events(null, {});

        // Assert
        expect(mockFind).toHaveBeenCalled();
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
        const mockFind = jest.fn().mockReturnThis();
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = mockFind;
        mockFind.mockReturnValue({ sort: mockSort });

        const date = '2023-01-01';

        // Act
        const result = await eventResolvers.Query.eventsByDate(null, { date });

        // Assert
        expect(mockFind).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.any(Object),
          }),
        );
        expect(mockSort).toHaveBeenCalledWith({ time: 1 });
        expect(result).toEqual({
          edges: expect.any(Array),
          pageInfo: expect.any(Object),
          totalCount: expect.any(Number),
        });
      });
    });

    describe('myEvents', () => {
      it('should return events created by the authenticated user', async () => {
        // Arrange
        const mockFind = jest.fn().mockReturnThis();
        const mockSort = jest.fn().mockReturnThis();
        (Event.find as jest.Mock) = mockFind;
        mockFind.mockReturnValue({ sort: mockSort });

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
        };

        const result = await (eventResolvers.Query.myEvents as any)(
          null,
          {},
          mockContext as any,
          {} as any,
        );

        // Assert
        expect(mockFind).toHaveBeenCalledWith({ creator: '1' });
        expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(result).toEqual({
          edges: expect.any(Array),
          pageInfo: expect.any(Object),
          totalCount: expect.any(Number),
        });
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
        const eventInput = {
          title: 'Updated Event',
          description: 'Updated Description',
          date: '2023-01-02',
          time: '15:00',
          location: 'Updated Location',
        };

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
        };

        // Mock Event.findById to return null
        (Event.findById as jest.Mock).mockResolvedValue(null);

        await expect(
          (eventResolvers.Mutation.updateEvent as any)(
            null,
            { id: '999', eventInput },
            mockContext as any,
            {} as any,
          ),
        ).rejects.toThrow(GraphQLError);
      });

      it('should throw error if user is not the creator', async () => {
        // Arrange
        const eventInput = {
          title: 'Updated Event',
          description: 'Updated Description',
          date: '2023-01-02',
          time: '15:00',
          location: 'Updated Location',
        };

        const mockEvent = {
          id: '1',
          title: 'Original Event',
          creator: { toString: () => '2' }, // Different user ID
        };

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
        };

        // Mock Event.findById
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        await expect(
          (eventResolvers.Mutation.updateEvent as any)(
            null,
            { id: '1', eventInput },
            mockContext as any,
            {} as any,
          ),
        ).rejects.toThrow(GraphQLError);
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

        const mockUser = {
          _id: '1',
          name: 'Test User',
        };

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
          pubsub: {
            publish: jest.fn(),
          },
          loaders: {
            userLoader: {
              load: jest.fn().mockResolvedValue(mockUser),
            },
          },
        };

        // Mock Event.findById
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        const result = await (eventResolvers.Mutation.attendEvent as any)(
          null,
          { eventId: eventId },
          mockContext as any,
          {} as any,
        );

        // Assert
        expect(Event.findById).toHaveBeenCalledWith(eventId);
        expect(mockEvent.attendees).toHaveLength(1);
        expect(mockEvent.attendees[0]).toBe('1');
        expect(mockSave).toHaveBeenCalled();
        expect(mockContext.loaders.userLoader.load).toHaveBeenCalledWith('1');
        expect(mockContext.pubsub.publish).toHaveBeenCalled();
        expect(result).toEqual(
          expect.objectContaining({
            _id: eventId,
            title: 'Test Event',
            attendees: ['1'],
          }),
        );
      });

      it('should throw error if already attending', async () => {
        // Arrange
        const mockEvent = {
          id: '1',
          title: 'Test Event',
          attendees: ['1'], // User already in attendees
        };

        const mockContext = {
          user: { id: '1', email: 'test@example.com' },
        };

        // Mock Event.findById
        (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

        await expect(
          (eventResolvers.Mutation.attendEvent as any)(
            null,
            { eventId: '1' },
            mockContext as any,
            {} as any,
          ),
        ).rejects.toThrow(GraphQLError);
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
          {} as any,
        );

        // Assert
        expect(mockContext.loaders.userLoader.load).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockUser);
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
          {} as any,
        );

        // Assert
        expect(mockContext.loaders.eventAttendeesLoader.load).toHaveBeenCalledWith('1');
        expect(result).toEqual(mockAttendees);
      });
    });
  });
});
