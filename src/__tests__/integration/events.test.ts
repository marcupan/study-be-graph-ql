import { ApolloServer } from 'apollo-server-express';
import {
  initializeDatabase,
  closeDatabase,
  clearDatabase,
  createTestServer,
  createTestUser,
  createTestEvent,
  executeOperation,
  executeAuthenticatedOperation,
  operations
} from '../utils/testServer';
import { Event } from '../../models/Event';
import { User } from '../../models/User';

describe('Events Integration Tests', () => {
  let server: ApolloServer;

  // Set up the database and server before all tests
  beforeAll(async () => {
    await initializeDatabase();
    server = createTestServer();
  });

  // Clear the database between tests
  afterEach(async () => {
    await clearDatabase();
  });

  // Close the database connection after all tests
  afterAll(async () => {
    await closeDatabase();
  });

  describe('Event Creation', () => {
    it('should create a new event when authenticated', async () => {
      // Arrange
      const { user, token } = await createTestUser();

      const eventInput = {
        title: 'Test Event',
        description: 'This is a test event',
        date: '2023-01-01',
        time: '14:00',
        location: 'Test Location',
        imageUrl: 'http://example.com/image.jpg'
      };

      // Act
      const response = await executeAuthenticatedOperation(server, {
        query: operations.createEvent,
        variables: { eventInput }
      }, token);

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data?.createEvent).toBeDefined();
      expect(response.data?.createEvent.title).toBe(eventInput.title);
      expect(response.data?.createEvent.description).toBe(eventInput.description);
      expect(response.data?.createEvent.date).toBeDefined();
      expect(response.data?.createEvent.time).toBe(eventInput.time);
      expect(response.data?.createEvent.location).toBe(eventInput.location);
      expect(response.data?.createEvent.imageUrl).toBe(eventInput.imageUrl);
      expect(response.data?.createEvent.creator.id).toBe(user.id);
      expect(response.data?.createEvent.attendees).toEqual([]);

      // Verify event was created in the database
      const event = await Event.findById(response.data?.createEvent.id);
      expect(event).toBeDefined();
      expect(event!.title).toBe(eventInput.title);
    });

    it('should not create an event when not authenticated', async () => {
      // Arrange
      const eventInput = {
        title: 'Test Event',
        description: 'This is a test event',
        date: '2023-01-01',
        time: '14:00',
        location: 'Test Location'
      };

      // Act
      const response = await executeOperation(server, {
        query: operations.createEvent,
        variables: { eventInput }
      });

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors![0].message).toContain('Authentication required');
    });

    it('should validate event input', async () => {
      // Arrange
      const { token } = await createTestUser();

      const invalidEventInput = {
        // Missing title
        description: 'This is a test event',
        date: '2023-01-01',
        time: '14:00',
        location: 'Test Location'
      };

      // Act
      const response = await executeAuthenticatedOperation(server, {
        query: operations.createEvent,
        variables: { eventInput: invalidEventInput }
      }, token);

      // Assert
      expect(response.errors).toBeDefined();
    });
  });

  describe('Event Queries', () => {
    it('should fetch all events', async () => {
      // Arrange
      const { user } = await createTestUser();

      // Create multiple events
      await createTestEvent(user.id, {
        title: 'Event 1',
        description: 'Description 1',
        date: new Date('2023-01-01'),
        time: '14:00',
        location: 'Location 1'
      });

      await createTestEvent(user.id, {
        title: 'Event 2',
        description: 'Description 2',
        date: new Date('2023-01-02'),
        time: '15:00',
        location: 'Location 2'
      });

      // Act
      const response = await executeOperation(server, {
        query: operations.getEvents,
        variables: { pagination: { page: 1, limit: 10 } }
      });

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data?.events).toBeDefined();
      expect(response.data?.events.edges).toHaveLength(2);
      expect(response.data?.events.totalCount).toBe(2);
      expect(response.data?.events.pageInfo.currentPage).toBe(1);
    });

    it('should fetch a single event by ID', async () => {
      // Arrange
      const { user } = await createTestUser();

      const event = await createTestEvent(user.id, {
        title: 'Test Event',
        description: 'This is a test event',
        date: new Date('2023-01-01'),
        time: '14:00',
        location: 'Test Location'
      });

      // Act
      const response = await executeOperation(server, {
        query: operations.getEvent,
        variables: { id: event.id }
      });

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data?.event).toBeDefined();
      expect(response.data?.event.id).toBe(event.id);
      expect(response.data?.event.title).toBe(event.title);
      expect(response.data?.event.description).toBe(event.description);
    });

    it('should return an error for non-existent event ID', async () => {
      // Act
      const response = await executeOperation(server, {
        query: operations.getEvent,
        variables: { id: 'nonexistent-id' }
      });

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors![0].message).toContain('Event not found');
    });
  });

  describe('Event Attendance', () => {
    it('should allow a user to attend an event', async () => {
      // Arrange
      const { user: creator } = await createTestUser({
        name: 'Creator',
        email: 'creator@example.com',
        password: 'password123'
      });

      const { user: attendee, token } = await createTestUser({
        name: 'Attendee',
        email: 'attendee@example.com',
        password: 'password123'
      });

      const event = await createTestEvent(creator.id, {
        title: 'Test Event',
        description: 'This is a test event',
        date: new Date('2023-01-01'),
        time: '14:00',
        location: 'Test Location'
      });

      // Act
      const response = await executeAuthenticatedOperation(server, {
        query: operations.attendEvent,
        variables: { eventId: event.id }
      }, token);

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data?.attendEvent).toBeDefined();
      expect(response.data?.attendEvent.id).toBe(event.id);
      expect(response.data?.attendEvent.attendees).toHaveLength(1);
      expect(response.data?.attendEvent.attendees[0].id).toBe(attendee.id);

      // Verify event was updated in the database
      const updatedEvent = await Event.findById(event.id);
      expect(updatedEvent).toBeDefined();
      expect(updatedEvent!.attendees).toHaveLength(1);
      expect(updatedEvent!.attendees[0].toString()).toBe(attendee.id);
    });

    it('should allow a user to cancel attendance', async () => {
      // Arrange
      const { user: creator } = await createTestUser({
        name: 'Creator',
        email: 'creator@example.com',
        password: 'password123'
      });

      const { user: attendee, token } = await createTestUser({
        name: 'Attendee',
        email: 'attendee@example.com',
        password: 'password123'
      });

      // Create event and add attendee
      const event = await createTestEvent(creator.id, {
        title: 'Test Event',
        description: 'This is a test event',
        date: new Date('2023-01-01'),
        time: '14:00',
        location: 'Test Location'
      });

      event.attendees.push(attendee._id);
      await event.save();

      // Act
      const response = await executeAuthenticatedOperation(server, {
        query: operations.cancelAttendance,
        variables: { eventId: event.id }
      }, token);

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data?.cancelAttendance).toBeDefined();
      expect(response.data?.cancelAttendance.id).toBe(event.id);
      expect(response.data?.cancelAttendance.attendees).toHaveLength(0);

      // Verify event was updated in the database
      const updatedEvent = await Event.findById(event.id);
      expect(updatedEvent).toBeDefined();
      expect(updatedEvent!.attendees).toHaveLength(0);
    });

    it('should not allow attending an event without authentication', async () => {
      // Arrange
      const { user } = await createTestUser();
      const event = await createTestEvent(user.id);

      // Act
      const response = await executeOperation(server, {
        query: operations.attendEvent,
        variables: { eventId: event.id }
      });

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors![0].message).toContain('Authentication required');
    });

    it('should not allow attending an event that does not exist', async () => {
      // Arrange
      const { token } = await createTestUser();

      // Act
      const response = await executeAuthenticatedOperation(server, {
        query: operations.attendEvent,
        variables: { eventId: 'nonexistent-id' }
      }, token);

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors![0].message).toContain('Event not found');
    });

    it('should not allow attending an event twice', async () => {
      // Arrange
      const { user: creator } = await createTestUser({
        name: 'Creator',
        email: 'creator@example.com',
        password: 'password123'
      });

      const { user: attendee, token } = await createTestUser({
        name: 'Attendee',
        email: 'attendee@example.com',
        password: 'password123'
      });

      // Create event and add attendee
      const event = await createTestEvent(creator.id);
      event.attendees.push(attendee._id);
      await event.save();

      // Act
      const response = await executeAuthenticatedOperation(server, {
        query: operations.attendEvent,
        variables: { eventId: event.id }
      }, token);

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors![0].message).toContain('Already attending this event');
    });
  });
});
