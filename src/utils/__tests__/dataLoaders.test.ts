import { createLoaders } from '../dataLoaders';
import { User } from '../../models/User';
import { Event } from '../../models/Event';
import { Types } from 'mongoose';

// Mock mongoose models
jest.mock('../../models/User', () => ({
  User: {
    find: jest.fn()
  }
}));

jest.mock('../../models/Event', () => ({
  Event: {
    find: jest.fn()
  }
}));

describe('DataLoaders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('userLoader', () => {
    it('should batch and load users by ID', async () => {
      // Arrange
      const mockUsers = [
        { _id: new Types.ObjectId('61c0ccf11d7bf83d153d7c06'), name: 'User 1' },
        { _id: new Types.ObjectId('61c0ccf11d7bf83d153d7c07'), name: 'User 2' }
      ];
      (User.find as jest.Mock).mockResolvedValue(mockUsers);

      const loaders = createLoaders();

      // Act
      const results = await Promise.all([
        loaders.userLoader.load('61c0ccf11d7bf83d153d7c06'),
        loaders.userLoader.load('61c0ccf11d7bf83d153d7c07'),
        loaders.userLoader.load('61c0ccf11d7bf83d153d7c08') // Non-existent ID
      ]);

      // Assert
      expect(User.find).toHaveBeenCalledTimes(1);
      expect(User.find).toHaveBeenCalledWith({
        _id: {
          $in: expect.arrayContaining([
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId)
          ])
        }
      });

      expect(results[0]).toEqual(mockUsers[0]);
      expect(results[1]).toEqual(mockUsers[1]);
      expect(results[2]).toBeNull();
    });
  });

  describe('eventLoader', () => {
    it('should batch and load events by ID', async () => {
      // Arrange
      const mockEvents = [
        { _id: new Types.ObjectId('61c0ccf11d7bf83d153d7c09'), title: 'Event 1' },
        { _id: new Types.ObjectId('61c0ccf11d7bf83d153d7c0a'), title: 'Event 2' }
      ];
      (Event.find as jest.Mock).mockResolvedValue(mockEvents);

      const loaders = createLoaders();

      // Act
      const results = await Promise.all([
        loaders.eventLoader.load('61c0ccf11d7bf83d153d7c09'),
        loaders.eventLoader.load('61c0ccf11d7bf83d153d7c0a'),
        loaders.eventLoader.load('61c0ccf11d7bf83d153d7c0b') // Non-existent ID
      ]);

      // Assert
      expect(Event.find).toHaveBeenCalledTimes(1);
      expect(Event.find).toHaveBeenCalledWith({
        _id: {
          $in: expect.arrayContaining([
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId)
          ])
        }
      });

      expect(results[0]).toEqual(mockEvents[0]);
      expect(results[1]).toEqual(mockEvents[1]);
      expect(results[2]).toBeNull();
    });
  });

  describe('userEventsLoader', () => {
    it('should batch and load events by creator ID', async () => {
      // Arrange
      const userId1 = '61c0ccf11d7bf83d153d7c06';
      const userId2 = '61c0ccf11d7bf83d153d7c07';

      const mockEvents = [
        { _id: new Types.ObjectId(), title: 'Event 1', creator: new Types.ObjectId(userId1) },
        { _id: new Types.ObjectId(), title: 'Event 2', creator: new Types.ObjectId(userId1) },
        { _id: new Types.ObjectId(), title: 'Event 3', creator: new Types.ObjectId(userId2) }
      ];

      (Event.find as jest.Mock).mockResolvedValue(mockEvents);

      const loaders = createLoaders();

      // Act
      const results = await Promise.all([
        loaders.userEventsLoader.load(userId1),
        loaders.userEventsLoader.load(userId2),
        loaders.userEventsLoader.load('61c0ccf11d7bf83d153d7c08') // No events
      ]);

      // Assert
      expect(Event.find).toHaveBeenCalledTimes(1);
      expect(Event.find).toHaveBeenCalledWith({
        creator: {
          $in: expect.arrayContaining([
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId)
          ])
        }
      });

      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(1);
      expect(results[2]).toHaveLength(0);
    });
  });

  describe('userAttendingEventsLoader', () => {
    it('should batch and load events by attendee ID', async () => {
      // Arrange
      const userId1 = '61c0ccf11d7bf83d153d7c06';
      const userId2 = '61c0ccf11d7bf83d153d7c07';

      const mockEvents = [
        {
          _id: new Types.ObjectId(),
          title: 'Event 1',
          attendees: [new Types.ObjectId(userId1), new Types.ObjectId(userId2)]
        },
        {
          _id: new Types.ObjectId(),
          title: 'Event 2',
          attendees: [new Types.ObjectId(userId1)]
        }
      ];

      (Event.find as jest.Mock).mockResolvedValue(mockEvents);

      const loaders = createLoaders();

      // Act
      const results = await Promise.all([
        loaders.userAttendingEventsLoader.load(userId1),
        loaders.userAttendingEventsLoader.load(userId2),
        loaders.userAttendingEventsLoader.load('61c0ccf11d7bf83d153d7c08') // No events
      ]);

      // Assert
      expect(Event.find).toHaveBeenCalledTimes(1);
      expect(Event.find).toHaveBeenCalledWith({
        attendees: {
          $in: expect.arrayContaining([
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId),
            expect.any(Types.ObjectId)
          ])
        }
      });

      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(1);
      expect(results[2]).toHaveLength(0);
    });
  });
});
