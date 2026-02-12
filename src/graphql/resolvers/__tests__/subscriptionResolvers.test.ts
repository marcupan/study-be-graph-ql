import { subscriptionResolvers, TOPICS } from '../subscriptionResolvers.js';

type SubscribeFn = (...args: unknown[]) => unknown;
type WithFilterFn = SubscribeFn & { filter?: (payload: unknown, variables: unknown) => boolean };
type SubscribeContext = NonNullable<
  Parameters<typeof subscriptionResolvers.Subscription.eventCreated.subscribe>[2]
>;

// Mock the withFilter function to test its arguments
jest.mock('graphql-subscriptions', () => ({
  ...jest.requireActual('graphql-subscriptions'),
  withFilter: jest.fn((fn, filter) => {
    // Return a function that we can inspect
    const newFn = fn as WithFilterFn;
    newFn.filter = filter;
    return newFn;
  }),
}));

describe('Subscription Resolvers', () => {
  let mockPubSub: SubscribeContext['pubsub'];
  let mockContext: SubscribeContext;

  beforeEach(() => {
    mockPubSub = {
      asyncIterator: jest.fn(() => 'test-iterator'),
    } as unknown as SubscribeContext['pubsub'];
    mockContext = { pubsub: mockPubSub };
    jest.clearAllMocks();
  });

  describe('eventCreated', () => {
    it('should subscribe to the EVENT_CREATED topic', () => {
      subscriptionResolvers.Subscription.eventCreated.subscribe(null, null, mockContext);
      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith([TOPICS.EVENT_CREATED]);
    });

    it('should throw an error if pubsub is not in the context', () => {
      expect(() =>
        subscriptionResolvers.Subscription.eventCreated.subscribe(null, null, undefined),
      ).toThrow('PubSub not available in context');
    });
  });

  describe('eventDeleted', () => {
    it('should subscribe to the EVENT_DELETED topic', () => {
      subscriptionResolvers.Subscription.eventDeleted.subscribe(null, null, mockContext);
      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith([TOPICS.EVENT_DELETED]);
    });

    it('should throw an error if pubsub is not in the context', () => {
      expect(() =>
        subscriptionResolvers.Subscription.eventDeleted.subscribe(null, null, undefined),
      ).toThrow('PubSub not available in context');
    });
  });

  describe('eventUpdated', () => {
    const { subscribe } = subscriptionResolvers.Subscription.eventUpdated;
    const filter = (subscribe as WithFilterFn).filter!;

    it('should subscribe to the EVENT_UPDATED topic', () => {
      subscribe(null, null, mockContext);
      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith([TOPICS.EVENT_UPDATED]);
    });

    it('should throw an error if pubsub is not in the context', () => {
      expect(() => subscribe(null, null, undefined)).toThrow('PubSub not available in context');
    });

    it('filter should return true if eventId matches', () => {
      const payload = { eventUpdated: { id: '123' } };
      const variables = { eventId: '123' };
      expect(filter(payload, variables)).toBe(true);
    });

    it('filter should return false if eventId does not match', () => {
      const payload = { eventUpdated: { id: '123' } };
      const variables = { eventId: '456' };
      expect(filter(payload, variables)).toBe(false);
    });

    it('filter should return true if no eventId is provided in variables', () => {
      const payload = { eventUpdated: { id: '123' } };
      const variables = {};
      expect(filter(payload, variables)).toBe(true);
    });

    it('filter should return false for invalid payload or variables', () => {
      expect(filter(null, { eventId: '123' })).toBe(false);
      expect(filter({ eventUpdated: { id: '123' } }, null)).toBe(false);
      expect(filter(undefined, undefined)).toBe(false);
    });
  });

  describe('userJoinedEvent', () => {
    const { subscribe } = subscriptionResolvers.Subscription.userJoinedEvent;
    const filter = (subscribe as WithFilterFn).filter!;

    it('should subscribe to the USER_JOINED_EVENT topic', () => {
      subscribe(null, null, mockContext);
      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith([TOPICS.USER_JOINED_EVENT]);
    });

    it('should throw an error if pubsub is not in the context', () => {
      expect(() => subscribe(null, null, undefined)).toThrow('PubSub not available in context');
    });

    it('filter should return true if eventId matches', () => {
      const payload = { eventId: '123' };
      const variables = { eventId: '123' };
      expect(filter(payload, variables)).toBe(true);
    });

    it('filter should return false if eventId does not match', () => {
      const payload = { eventId: '123' };
      const variables = { eventId: '456' };
      expect(filter(payload, variables)).toBe(false);
    });

    it('filter should return false if no eventId is provided in variables', () => {
      const payload = { eventId: '123' };
      const variables = {};
      expect(filter(payload, variables)).toBe(false);
    });
  });

  describe('userLeftEvent', () => {
    const { subscribe } = subscriptionResolvers.Subscription.userLeftEvent;
    const filter = (subscribe as WithFilterFn).filter!;

    it('should subscribe to the USER_LEFT_EVENT topic', () => {
      subscribe(null, null, mockContext);
      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith([TOPICS.USER_LEFT_EVENT]);
    });

    it('should throw an error if pubsub is not in the context', () => {
      expect(() => subscribe(null, null, undefined)).toThrow('PubSub not available in context');
    });

    it('filter should return true if eventId matches', () => {
      const payload = { eventId: '123' };
      const variables = { eventId: '123' };
      expect(filter(payload, variables)).toBe(true);
    });

    it('filter should return false if eventId does not match', () => {
      const payload = { eventId: '123' };
      const variables = { eventId: '456' };
      expect(filter(payload, variables)).toBe(false);
    });

    it('filter should return false if no eventId is provided in variables', () => {
      const payload = { eventId: '123' };
      const variables = {};
      expect(filter(payload, variables)).toBe(false);
    });
  });
});
