export type Conversation = {
  id: string;
  assignedUser: string | null;
  subject: string;
  blurb: string;
  messageCount: number;
  lastUpdatedTimestamp: number;
};

export type EventData = {
  timestamp: number;
  conversationId: string;
  user?: string;
  subject?: string;
  body?: string;
};

// I try to avoid using the enums as it has some drawbacks.prefer to use const assertions
export const EventType = {
  MessageReceived: 'messageReceived',
  Assigned: 'assigned',
  Unassigned: 'unassigned',
  TypingStarted: 'typingStarted',
  TypingStopped: 'typingStopped',
} as const;

export type EventTypeKeys = (typeof EventType)[keyof typeof EventType];

export type ConversationEvent = {
  type: EventTypeKeys;
  data: EventData;
};

export const defaultConversation: Omit<Conversation, 'id'> = {
  assignedUser: null,
  subject: '',
  blurb: '',
  messageCount: 0,
  lastUpdatedTimestamp: 0,
};
