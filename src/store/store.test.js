import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Store } from './store';
import { EventType, Conversation } from './utils.types';

//This is to test -
//Event may be received more than once.
//This means the application can receive an event that has all the same values (including timestamp) as a previously received event.
describe('uniqueEvents', () => {
  let store;

  beforeEach(() => {
    store = new Store();
    vi.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to suppress output
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore original console.log
  });

  it('should process a unique event and add it to uniqueEvents', () => {
    const event = {
      type: 'messageReceived',
      data: {
        timestamp: 1,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    store.handleEvent(event);

    // Verify that the event is added to uniqueEvents
    expect(store['uniqueEvents'].has('conversation1-1')).toBe(true);
  });

  it('should not process a duplicate event', () => {
    const event = {
      type: 'messageReceived',
      data: {
        timestamp: 1,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    // Process the event for the first time
    store.handleEvent(event);

    // Process the same event again
    store.handleEvent(event);

    // Verify that the event is not processed twice
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation?.messageCount).toBe(1); // Message count should not increment again
    expect(console.log).toHaveBeenCalledWith('Event already processed:', 'conversation1-1');
  });

  it('should remove an event from uniqueEvents if the event type is unknown', () => {
    const event = {
      type: 'unknownEvent',
      data: {
        timestamp: 2,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    store.handleEvent(event);

    // Verify that the event is removed from uniqueEvents
    expect(store['uniqueEvents'].has('conversation1-2')).toBe(false);
  });

  it('should handle multiple unique events correctly', () => {
    const event1 = {
      type: 'messageReceived',
      data: {
        timestamp: 3,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Test Subject 1',
        body: 'Test Body 1',
      },
    };

    const event2 = {
      type: 'messageReceived',
      data: {
        timestamp: 4,
        conversationId: 'conversation1',
        user: 'user2',
        subject: 'Test Subject 2',
        body: 'Test Body 2',
      },
    };

    // Process both events
    store.handleEvent(event1);
    store.handleEvent(event2);

    // Verify that both events are added to uniqueEvents
    expect(store['uniqueEvents'].has('conversation1-3')).toBe(true);
    expect(store['uniqueEvents'].has('conversation1-4')).toBe(true);

    // Verify that the conversation reflects the most recent event
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation?.messageCount).toBe(2);
    expect(conversation?.blurb).toBe('Test Body 2');
  });
});

//This is to test - The application can receive an event type that is not listed above.
describe('handleEvent - Unlisted Event Types', () => {
  let store;

  beforeEach(() => {
    store = new Store();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log a warning for an unlisted event type', () => {
    const unlistedEvent = {
      type: 'unknownEvent',
      data: {
        timestamp: Date.now(),
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    store.handleEvent(unlistedEvent);

    expect(console.warn).toHaveBeenCalledWith('Unknown event type:', 'unknownEvent');
  });

  it('should not modify the conversation for an unlisted event type', () => {
    const unlistedEvent = {
      type: 'unknownEvent',
      data: {
        timestamp: Date.now(),
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    store.handleEvent(unlistedEvent);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeUndefined();
  });
});

//This is to test -
//Event may be received more than once.
//This means the application can receive an event that has all the same values (including timestamp) as a previously received event.
describe('handleEvent - Duplicate Events', () => {
  let store;

  beforeEach(() => {
    store = new Store();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process an event only once', () => {
    const event = {
      type: 'messageReceived',
      data: {
        timestamp: 1234567890,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    // Process the event for the first time
    store.handleEvent(event);

    // Process the same event again
    store.handleEvent(event);

    // Verify that the conversation was updated only once
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.messageCount).toBe(1); // Message count should not increment again
    expect(conversation?.blurb).toBe('Test Body');
  });

  it('should log a message when a duplicate event is received', () => {
    const event = {
      type: 'messageReceived',
      data: {
        timestamp: 1234567890,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    // Process the event for the first time
    store.handleEvent(event);

    // Process the same event again
    store.handleEvent(event);

    // Verify that a log message was generated for the duplicate event
    expect(console.log).toHaveBeenCalledWith('Event already processed:', 'conversation1-1234567890');
  });
});

//This is to test -
//Events may be received in a different order than the order in which they happened. This means the application can receive events with a timestamp that is older than that of a previously received event.
describe('handleEvent - Out-of-Order Events', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should update the conversation only if the event has a newer timestamp', () => {
    const oldTimeStamp = Date.now() - 1000; // Older timestamp
    const newerTimeStamp = Date.now(); // Newer timestamp
    const olderEvent = {
      type: 'messageReceived',
      data: {
        timestamp: oldTimeStamp,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Old Subject',
        body: 'Old Body',
      },
    };

    const newerEvent = {
      type: 'messageReceived',
      data: {
        timestamp: newerTimeStamp,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'New Subject',
        body: 'New Body',
      },
    };

    // Process the newer event first
    store.handleEvent(newerEvent);

    // Process the older event
    store.handleEvent(olderEvent);

    // Verify that the conversation reflects the newer event
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.subject).toBe('New Subject');
    expect(conversation?.blurb).toBe('New Body');
    expect(conversation?.lastUpdatedTimestamp).toBe(newerTimeStamp); // Timestamp should not be overwritten
  });

  it('should update the conversation if the event has a newer timestamp', () => {
    const olderEvent = {
      type: 'messageReceived',
      data: {
        timestamp: 1234567890,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Old Subject',
        body: 'Old Body',
      },
    };

    const newerEvent = {
      type: 'messageReceived',
      data: {
        timestamp: 1234567891,
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'New Subject',
        body: 'New Body',
      },
    };

    // Process the older event first
    store.handleEvent(olderEvent);

    // Process the newer event
    store.handleEvent(newerEvent);

    // Verify that the conversation reflects the newer event
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.subject).toBe('New Subject');
    expect(conversation?.blurb).toBe('New Body');
    expect(conversation?.lastUpdatedTimestamp).toBe(1234567891); // Timestamp should be updated
  });
});

//This is to test -
//If no users are typing, the first 256 characters of the body of the most recent message
describe('handleEvent - Blurb for Most Recent Message', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should set the blurb to the first 256 characters of the most recent message if no users are typing', () => {
    const messageEvent1 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'Test Subject 1',
        body: 'This is the first message body.',
      },
    };

    const messageEvent2 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269130,
        conversationId: 'conversation1',
        subject: 'Test Subject 2',
        body: 'This is the second message body, which is more recent and should be used for the blurb.',
      },
    };

    // Process the first message
    store.handleEvent(messageEvent1);

    // Process the second (more recent) message
    store.handleEvent(messageEvent2);

    // Verify that the blurb is set to the body of the most recent message
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe(
      'This is the second message body, which is more recent and should be used for the blurb.'
    );
  });

  it('should truncate the blurb to 256 characters if the message body is too long', () => {
    const longMessageBody = 'A'.repeat(300); // A message body with 300 characters
    const messageEvent = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: longMessageBody,
      },
    };

    // Process the message
    store.handleEvent(messageEvent);

    // Verify that the blurb is truncated to 256 characters
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe(longMessageBody.slice(0, 256));
  });

  it('should not overwrite the blurb if users are typing', () => {
    const messageEvent = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'This is the message body.',
      },
    };

    const typingEvent = {
      type: 'typingStarted',
      data: {
        timestamp: 1650901269130,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    // Process the message
    store.handleEvent(messageEvent);

    // Process the typing event
    store.handleEvent(typingEvent);

    // Verify that the blurb reflects the typing user, not the message body
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe('user1 is replying...');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from './store';

describe('handleEvent - Most Recent Message Subject', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should update the subject to the most recent message', () => {
    const messageEvent1 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'First Subject',
        body: 'This is the first message body.',
      },
    };

    const messageEvent2 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269130,
        conversationId: 'conversation1',
        subject: 'Second Subject',
        body: 'This is the second message body.',
      },
    };

    // Process the first message
    store.handleEvent(messageEvent1);

    // Process the second (more recent) message
    store.handleEvent(messageEvent2);

    // Verify that the subject is updated to the most recent message
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.subject).toBe('Second Subject');
  });

  it('should not update the subject if the message is older than the most recent one', () => {
    const messageEvent1 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269130,
        conversationId: 'conversation1',
        subject: 'Most Recent Subject',
        body: 'This is the most recent message body.',
      },
    };

    const messageEvent2 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'Older Subject',
        body: 'This is an older message body.',
      },
    };

    // Process the most recent message first
    store.handleEvent(messageEvent1);

    // Process the older message
    store.handleEvent(messageEvent2);

    // Verify that the subject is not updated to the older message
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.subject).toBe('Most Recent Subject');
  });

  it('should handle conversations with no subject in the message', () => {
    const messageEvent1 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'First Subject',
        body: 'This is the first message body.',
      },
    };

    const messageEvent2 = {
      type: 'messageReceived',
      data: {
        timestamp: 1650901269130,
        conversationId: 'conversation1',
        body: 'This is a message without a subject.',
      },
    };

    // Process the first message
    store.handleEvent(messageEvent1);

    // Process the second message (without a subject)
    store.handleEvent(messageEvent2);

    // Verify that the subject remains unchanged
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.subject).toBe('First Subject');
  });
});

describe('handleEvent - Missing Timestamp', () => {
  let store;

  beforeEach(() => {
    store = new Store();
    vi.spyOn(console, 'warn').mockImplementation(() => {}); // Mock console.warn to suppress output
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore original console.warn
  });

  it('should log a warning and ignore the event if timestamp is missing', () => {
    const eventWithoutTimestamp = {
      type: 'messageReceived',
      data: {
        conversationId: 'conversation1',
        user: 'user1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    store.handleEvent(eventWithoutTimestamp);

    // Verify that a warning is logged
    expect(console.warn).toHaveBeenCalledWith('Event is missing a timestamp:', eventWithoutTimestamp);

    // Verify that the event is not processed
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeUndefined();
  });

  it('should log a warning and ignore the event if conversationId is missing', () => {
    const eventWithoutTimestamp = {
      type: 'messageReceived',
      data: {
        user: 'user1',
        subject: 'Test Subject',
        body: 'Test Body',
        timestamp: Date.now(),
      },
    };

    store.handleEvent(eventWithoutTimestamp);

    // Verify that a warning is logged
    expect(console.warn).toHaveBeenCalledWith('Event is missing a conversationId:', eventWithoutTimestamp);

    // Verify that the event is not processed
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeUndefined();
  });
});

describe('handleEvent - All Event Types', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should handle "messageReceived" event and update the conversation', () => {
    const event = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 1,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    store.handleEvent(event);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.subject).toBe('Test Subject');
    expect(conversation?.blurb).toBe('Test Body');
    expect(conversation?.messageCount).toBe(1);
    expect(conversation?.lastUpdatedTimestamp).toBe(1);
  });

  it('should handle "assigned" event and assign the user to the conversation', () => {
    const event = {
      type: EventType.Assigned,
      data: {
        timestamp: 2,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    store.handleEvent(event);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.assignedUser).toBe('user1');
    expect(conversation?.lastUpdatedTimestamp).toBe(2);
  });

  it('should handle "unassigned" event and unassign the user from the conversation', () => {
    const event = {
      type: EventType.Unassigned,
      data: {
        timestamp: 3,
        conversationId: 'conversation1',
      },
    };

    store.handleEvent(event);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.assignedUser).toBeNull();
    expect(conversation?.lastUpdatedTimestamp).toBe(3);
  });

  it('should handle "typingStarted" event and update the blurb with typing users', () => {
    const event = {
      type: EventType.TypingStarted,
      data: {
        timestamp: 4,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    store.handleEvent(event);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe('user1 is replying...');
  });

  it('should handle "typingStopped" event and remove the user from the typing blurb', () => {
    const typingStartedEvent = {
      type: EventType.TypingStarted,
      data: {
        timestamp: 5,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    const typingStoppedEvent = {
      type: EventType.TypingStopped,
      data: {
        timestamp: 6,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    store.handleEvent(typingStartedEvent);
    store.handleEvent(typingStoppedEvent);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe('');
  });

  it('should ignore events with an unknown type', () => {
    const messageReceived = {
      type: 'messageReceived',
      data: {
        conversationId: 'conversation1',
        timestamp: 6,
        subject: 'Re: Autem eos',
        body: 'Sapiente facere dolor excepturi voluptatem.',
      },
    };
    const event = {
      type: 'test',
      data: {
        timestamp: 7,
        conversationId: 'conversation1',
      },
    };

    store.handleEvent(messageReceived);
    store.handleEvent(event);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation?.blurb).toBe('Sapiente facere dolor excepturi voluptatem.');
  });
});

describe('handleEvent - Exclude Conversations Assigned to John_Doe', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should exclude a conversation assigned to John_Doe', () => {
    const assignEvent = {
      type: EventType.Assigned,
      data: {
        timestamp: 1650883423042,
        conversationId: 'conversation1',
        user: 'John_Doe',
      },
    };

    const messageEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 1650880877271,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    // Process the message event
    store.handleEvent(messageEvent);

    // Assign the conversation to John_Doe
    store.handleEvent(assignEvent);

    // Verify that the conversation is excluded
    const conversations = store.getConversations();
    const conversation = conversations.find((c) => c.id === 'conversation1');
    expect(conversation).toBeUndefined();
  });

  it('should include a conversation after it is unassigned from John_Doe', () => {
    const assignEvent = {
      type: EventType.Assigned,
      data: {
        timestamp: 1650883423042,
        conversationId: 'conversation1',
        user: 'John_Doe',
      },
    };

    const unassignEvent = {
      type: EventType.Unassigned,
      data: {
        timestamp: 1650883424042,
        conversationId: 'conversation1',
      },
    };

    const messageEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 1650880877271,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    // Process the message event
    store.handleEvent(messageEvent);

    // Assign the conversation to John_Doe
    store.handleEvent(assignEvent);

    // Unassign the conversation from John_Doe
    store.handleEvent(unassignEvent);

    // Verify that the conversation is included
    const conversations = store.getConversations();
    const conversation = conversations.find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.assignedUser).toBeNull();
  });

  it('should include a conversation assigned to other users', () => {
    const assignEvent = {
      type: EventType.Assigned,
      data: {
        timestamp: 1650883423042,
        conversationId: 'conversation1',
        user: 'Jane_Doe',
      },
    };

    const messageEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 1650880877271,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'Test Body',
      },
    };

    // Process the message event
    store.handleEvent(messageEvent);

    // Assign the conversation to Jane_Doe
    store.handleEvent(assignEvent);

    // Verify that the conversation is included
    const conversations = store.getConversations();
    const conversation = conversations.find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.assignedUser).toBe('Jane_Doe');
  });
});

describe('handleEvent - Update Blurb Only If No Users Are Typing', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should update the blurb to the most recent message body if no users are typing', () => {
    const messageEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'This is the most recent message body.',
      },
    };

    // Process the message event
    store.handleEvent(messageEvent);

    // Verify that the blurb is updated to the message body
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe('This is the most recent message body.');
  });

  it('should not update the blurb to the message body if users are typing', () => {
    const typingEvent = {
      type: EventType.TypingStarted,
      data: {
        timestamp: 1650901269126,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    const messageEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'This is the most recent message body.',
      },
    };

    // Process the typing event
    store.handleEvent(typingEvent);

    // Process the message event
    store.handleEvent(messageEvent);

    // Verify that the blurb reflects the typing user, not the message body
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe('user1 is replying...');
  });

  it('should update the blurb to the message body after all users stop typing', () => {
    const typingEvent = {
      type: EventType.TypingStarted,
      data: {
        timestamp: 1650901269126,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    const messageEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 1650901269127,
        conversationId: 'conversation1',
        subject: 'Test Subject',
        body: 'This is the most recent message body.',
      },
    };

    const typingStoppedEvent = {
      type: EventType.TypingStopped,
      data: {
        timestamp: 1650901269128,
        conversationId: 'conversation1',
        user: 'user1',
      },
    };

    // Process the typing event
    store.handleEvent(typingEvent);

    // Process the message event
    store.handleEvent(messageEvent);

    // Process the typing stopped event
    store.handleEvent(typingStoppedEvent);

    // Verify that the blurb is updated to the message body after typing stops
    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation).toBeDefined();
    expect(conversation?.blurb).toBe('This is the most recent message body.');
  });

  it('should ignore duplicate events with the same conversationId and timestamp', () => {
    const event = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 10,
        conversationId: 'conversation1',
        subject: 'Duplicate Event',
        body: 'This is a duplicate event.',
      },
    };

    store.handleEvent(event);
    store.handleEvent(event); // Duplicate event

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation?.messageCount).toBe(1); // Message count should not increment
    expect(conversation?.blurb).toBe('This is a duplicate event.');
  });

  it('should ignore out-of-order events with an older timestamp', () => {
    const newerEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 20,
        conversationId: 'conversation1',
        subject: 'Newer Event',
        body: 'This is the newer event.',
      },
    };

    const olderEvent = {
      type: EventType.MessageReceived,
      data: {
        timestamp: 10,
        conversationId: 'conversation1',
        subject: 'Older Event',
        body: 'This is the older event.',
      },
    };

    store.handleEvent(newerEvent);
    store.handleEvent(olderEvent);

    const conversation = store.getConversations().find((c) => c.id === 'conversation1');
    expect(conversation?.lastUpdatedTimestamp).toBe(20); // Timestamp should remain the newer one
    expect(conversation?.blurb).toBe('This is the newer event.');
  });
});

describe('isConversationEmptyThenRemove', () => {
  let store;
  const defaultConversation = {
    id: '',
    assignedUser: null,
    subject: '',
    blurb: '',
    messageCount: 0,
    lastUpdatedTimestamp: 0,
  };

  beforeEach(() => {
    store = new Store();
  });

  it('should return true if the conversation does not exist', () => {
    const result = store.isConversationEmptyThenRemove('nonexistent-id');
    expect(result).toBe(true);
  });

  it('should return true and remove the conversation if it is empty', () => {
    const conversationId = 'test-id';
    store['conversations'].set(conversationId, { ...defaultConversation, id: conversationId });

    const result = store.isConversationEmptyThenRemove(conversationId);

    expect(result).toBe(true);
    expect(store['conversations'].has(conversationId)).toBe(false);
  });

  it('should return false if the conversation is not empty', () => {
    const conversationId = 'test-id';
    store['conversations'].set(conversationId, {
      ...defaultConversation,
      id: conversationId,
      subject: 'Test Subject',
    });

    const result = store.isConversationEmptyThenRemove(conversationId);

    expect(result).toBe(false);
    expect(store['conversations'].has(conversationId)).toBe(true);
  });
});
describe('addAndgetBlurbForTypingUsers', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should add a user to the typing list and return the correct blurb for a single user', () => {
    const conversationId = 'conversation1';
    const user = 'user1';

    const blurb = store.addAndgetBlurbForTypingUsers(conversationId, user);

    expect(blurb).toBe('user1 is replying...');
    expect(store['typingUsers'].get(conversationId)).toContain(user);
  });

  it('should add multiple users to the typing list and return the correct blurb', () => {
    const conversationId = 'conversation1';
    const user1 = 'user1';
    const user2 = 'user2';

    store.addAndgetBlurbForTypingUsers(conversationId, user1);
    const blurb = store.addAndgetBlurbForTypingUsers(conversationId, user2);

    expect(blurb).toBe('user1, user2 are replying...');
    expect(store['typingUsers'].get(conversationId)).toContain(user1);
    expect(store['typingUsers'].get(conversationId)).toContain(user2);
  });

  it('should not add the same user multiple times to the typing list', () => {
    const conversationId = 'conversation1';
    const user = 'user1';

    store.addAndgetBlurbForTypingUsers(conversationId, user);
    const blurb = store.addAndgetBlurbForTypingUsers(conversationId, user);

    expect(blurb).toBe('user1 is replying...');
    expect(store['typingUsers'].get(conversationId).size).toBe(1);
  });

  it('should handle adding users to multiple conversations', () => {
    const conversationId1 = 'conversation1';
    const conversationId2 = 'conversation2';
    const user1 = 'user1';
    const user2 = 'user2';

    const blurb1 = store.addAndgetBlurbForTypingUsers(conversationId1, user1);
    const blurb2 = store.addAndgetBlurbForTypingUsers(conversationId2, user2);

    expect(blurb1).toBe('user1 is replying...');
    expect(blurb2).toBe('user2 is replying...');
    expect(store['typingUsers'].get(conversationId1)).toContain(user1);
    expect(store['typingUsers'].get(conversationId2)).toContain(user2);
  });

  it('should return an empty string if no user is provided', () => {
    const conversationId = 'conversation1';

    const blurb = store.addAndgetBlurbForTypingUsers(conversationId, undefined);

    expect(blurb).toBe('');
    expect(store['typingUsers'].get(conversationId)).toBeUndefined();
  });
});

describe('Test getConversations', () => {
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('should exclude conversations assigned to blacklisted users', () => {
    const conversation1 = {
      id: 'conversation1',
      assignedUser: 'John_Doe',
      subject: 'Subject 1',
      blurb: 'Blurb 1',
      messageCount: 1,
      lastUpdatedTimestamp: 10,
    };

    const conversation2 = {
      id: 'conversation2',
      assignedUser: 'Mangesh',
      subject: 'Subject 2',
      blurb: 'Blurb 2',
      messageCount: 2,
      lastUpdatedTimestamp: 20,
    };

    store['conversations'].set('conversation1', conversation1);
    store['conversations'].set('conversation2', conversation2);

    const result = store.getConversations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('conversation2');
  });

  it('should sort conversations by lastUpdatedTimestamp in descending order', () => {
    const conversation1 = {
      id: 'conversation1',
      assignedUser: 'Mangesh',
      subject: 'Subject 1',
      blurb: 'Blurb 1',
      messageCount: 1,
      lastUpdatedTimestamp: 10,
    };

    const conversation2 = {
      id: 'conversation2',
      assignedUser: 'Mangesh',
      subject: 'Subject 2',
      blurb: 'Blurb 2',
      messageCount: 2,
      lastUpdatedTimestamp: 20,
    };

    store['conversations'].set('conversation1', conversation1);
    store['conversations'].set('conversation2', conversation2);

    const result = store.getConversations();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('conversation2');
    expect(result[1].id).toBe('conversation1');
  });

  it('should return all conversations when no blacklisted users are assigned', () => {
    const conversation1 = {
      id: 'conversation1',
      assignedUser: 'User1',
      subject: 'Subject 1',
      blurb: 'Blurb 1',
      messageCount: 1,
      lastUpdatedTimestamp: 10,
    };

    const conversation2 = {
      id: 'conversation2',
      assignedUser: 'User2',
      subject: 'Subject 2',
      blurb: 'Blurb 2',
      messageCount: 2,
      lastUpdatedTimestamp: 20,
    };

    store['conversations'].set('conversation1', conversation1);
    store['conversations'].set('conversation2', conversation2);

    const result = store.getConversations();
    expect(result).toHaveLength(2);
  });

  it('should return an empty array when there are no conversations', () => {
    const result = store.getConversations();
    expect(result).toHaveLength(0);
  });

  it('should include conversations with null assignedUser', () => {
    const conversation = {
      id: 'conversation1',
      assignedUser: null,
      subject: 'Subject 1',
      blurb: 'Blurb 1',
      messageCount: 1,
      lastUpdatedTimestamp: 10,
    };

    store['conversations'].set('conversation1', conversation);

    const result = store.getConversations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('conversation1');
  });
});
