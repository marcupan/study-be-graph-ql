import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';

import { Event } from '../../../models/Event.js';

export const findEventOrThrow = async (eventId: string) => {
  if (!isValidObjectId(eventId)) {
    throw new GraphQLError('Event not found', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const event = await Event.findById(eventId);
  if (!event) {
    throw new GraphQLError('Event not found', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return event;
};
