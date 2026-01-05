import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { Event } from '../Event.js';
import { User } from '../User.js';

describe('Event Model', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;

  // Set up the in-memory MongoDB server before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Create a test user before each test
  beforeEach(async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    testUser = await user.save();
  });

  // Clear the database between tests
  afterEach(async () => {
    await Event.deleteMany({});
    await User.deleteMany({});
  });

  // Close the connection and stop the server after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should create a new event successfully', async () => {
    // Arrange
    const eventData = {
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
      creator: testUser._id,
    };

    // Act
    const event = new Event(eventData);
    const savedEvent = await event.save();

    // Assert
    expect(savedEvent._id).toBeDefined();
    expect(savedEvent.title).toBe(eventData.title);
    expect(savedEvent.description).toBe(eventData.description);
    expect(savedEvent.date).toEqual(eventData.date);
    expect(savedEvent.time).toBe(eventData.time);
    expect(savedEvent.location).toBe(eventData.location);
    expect(savedEvent.creator.toString()).toBe(testUser._id.toString());
    expect(savedEvent.attendees).toEqual([]);
    expect(savedEvent.createdAt).toBeDefined();
    expect(savedEvent.updatedAt).toBeDefined();
  });

  it('should fail validation when required fields are missing', async () => {
    // Arrange
    const eventWithoutTitle = new Event({
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
      creator: testUser._id,
    });

    const eventWithoutDescription = new Event({
      title: 'Test Event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
      creator: testUser._id,
    });

    const eventWithoutDate = new Event({
      title: 'Test Event',
      description: 'This is a test event',
      time: '14:00',
      location: 'Test Location',
      creator: testUser._id,
    });

    const eventWithoutTime = new Event({
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      location: 'Test Location',
      creator: testUser._id,
    });

    const eventWithoutLocation = new Event({
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      creator: testUser._id,
    });

    const eventWithoutCreator = new Event({
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
    });

    // Act & Assert
    await expect(eventWithoutTitle.validate()).rejects.toThrow();
    await expect(eventWithoutDescription.validate()).rejects.toThrow();
    await expect(eventWithoutDate.validate()).rejects.toThrow();
    await expect(eventWithoutTime.validate()).rejects.toThrow();
    await expect(eventWithoutLocation.validate()).rejects.toThrow();
    await expect(eventWithoutCreator.validate()).rejects.toThrow();
  });

  it('should trim whitespace from string fields', async () => {
    // Arrange
    const eventData = {
      title: '  Test Event  ',
      description: '  This is a test event  ',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: '  Test Location  ',
      imageUrl: '  http://example.com/image.jpg  ',
      creator: testUser._id,
    };

    // Act
    const event = new Event(eventData);
    const savedEvent = await event.save();

    // Assert
    expect(savedEvent.title).toBe('Test Event');
    expect(savedEvent.description).toBe('This is a test event');
    expect(savedEvent.location).toBe('Test Location');
    expect(savedEvent.imageUrl).toBe('http://example.com/image.jpg');
  });

  it('should allow optional imageUrl field', async () => {
    // Arrange
    const eventWithImageUrl = {
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
      imageUrl: 'http://example.com/image.jpg',
      creator: testUser._id,
    };

    const eventWithoutImageUrl = {
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
      creator: testUser._id,
    };

    // Act
    const event1 = new Event(eventWithImageUrl);
    const savedEvent1 = await event1.save();

    const event2 = new Event(eventWithoutImageUrl);
    const savedEvent2 = await event2.save();

    // Assert
    expect(savedEvent1.imageUrl).toBe(eventWithImageUrl.imageUrl);
    expect(savedEvent2.imageUrl).toBeUndefined();
  });

  it('should allow adding attendees to an event', async () => {
    // Arrange
    const eventData = {
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
      creator: testUser._id,
      attendees: [],
    };

    // Create another user to be an attendee
    const attendee = new User({
      name: 'Attendee User',
      email: 'attendee@example.com',
      password: 'password123',
    });
    const savedAttendee = await attendee.save();

    // Act
    const event = new Event(eventData);
    const savedEvent = await event.save();

    // Add attendee to the event
    savedEvent.attendees.push(savedAttendee._id);
    const updatedEvent = await savedEvent.save();

    // Assert
    expect(updatedEvent.attendees).toHaveLength(1);
    expect(updatedEvent.attendees[0].toString()).toBe(savedAttendee._id.toString());
  });

  it('should correctly reference the User model', async () => {
    // Arrange
    const eventData = {
      title: 'Test Event',
      description: 'This is a test event',
      date: new Date('2023-01-01'),
      time: '14:00',
      location: 'Test Location',
      creator: testUser._id,
    };

    // Act
    const event = new Event(eventData);
    await event.save();

    // Find the event and populate the creator
    const foundEvent = await Event.findById(event._id).populate('creator');

    // Assert
    expect(foundEvent).toBeDefined();
    expect(foundEvent!.creator).toBeDefined();
    expect((foundEvent!.creator as any).name).toBe(testUser.name);
    expect((foundEvent!.creator as any).email).toBe(testUser.email);
  });
});
