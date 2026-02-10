import { GraphQLError } from 'graphql';

import type { IEvent } from '../../../models/Event.js';

export const checkIsCreator = (event: IEvent, userId: string) => {
  if (event.creator.toString() !== userId) {
    throw new GraphQLError('Not authorized to perform this action', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
};
