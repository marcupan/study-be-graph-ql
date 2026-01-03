import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { Event } from './models/Event.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/auth.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env['MONGODB_URI'] as string);
    console.log('Connected to the database.');

    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    console.log('Cleared existing data.');

    // Create a test user
    const hashedPassword = await hashPassword('password123');
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
    });
    const savedUser = await user.save();
    console.log('Created test user:', savedUser);

    // Create some test events
    const events = [
      {
        title: 'GraphQL Meetup',
        description: 'A meetup for GraphQL enthusiasts.',
        date: new Date('2025-12-25'),
        time: '18:00',
        location: 'Online',
        creator: savedUser._id,
      },
      {
        title: 'React Conference',
        description: 'A conference for React developers.',
        date: new Date('2026-01-15'),
        time: '09:00',
        location: 'San Francisco',
        creator: savedUser._id,
      },
    ];

    const savedEvents = await Event.insertMany(events);
    console.log('Created test events:', savedEvents);

    await mongoose.disconnect();
    console.log('Disconnected from the database.');
  } catch (error) {
    console.error('Error seeding the database:', error);
    process.exit(1);
  }
};

void seedDatabase();
