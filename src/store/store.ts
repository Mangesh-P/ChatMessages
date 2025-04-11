import { defaultConversation, Conversation, ConversationEvent, EventType } from './utils.types';

export class Store {
  /*This map will store the conversations
  They key is the conversationId and the value is the conversation object
  The hashmap is used to store as it is more efficient and faster as it takes O(1) time to access the value
  Map can use used to store huge amount of data without performance issues */
  private conversations = new Map<string, Conversation>();

  /*As the blurb is updated when the user is typing, we need to store the last body of the message
  This is used to store the last body of the message when the user is typing */
  private lastBody = new Map<string, string>();

  //This blacklist array can be modified or can use retrieved from the server
  private blackListedUsers = ['John_Doe'];

  //Set will make sure  it is unique conversationId-timestamp pair
  private uniqueEvents = new Set<string>();

  private typingUsers = new Map<string, Set<string>>();

  /**
   * Returns an array of conversation objects in reverse chronological order.
   *
   * @returns {readonly {
   *   id: string,
   *   assignedUser: string | null,
   *   subject: string,
   *   blurb: string,
   *   messageCount: number,
   *   lastUpdatedTimestamp: number
   * }[]}
   */
  getConversations(): readonly Conversation[] {
    //Convert the Conversations Map to an array
    let conversations = Array.from(this.conversations.values()) as Conversation[];
    let blackListedUsers = this.blackListedUsers;

    /*From the conversations array, filter out the conversations that have an assigned user in the blacklisted users
    Blacklisted users are defined in the class property
    This blacklist array can be modified or can use retrieved from the server */
    let filteredUsers = conversations.filter((conversation: Conversation) => {
      //return conversation.assignedUser !== 'John_Doe';
      return !blackListedUsers.includes(conversation.assignedUser || '');
    });

    //Sort the conversations by lastUpdatedTimestamp in descending order
    let sortedConversations = filteredUsers.sort((a: Conversation, b: Conversation) => {
      return b.lastUpdatedTimestamp - a.lastUpdatedTimestamp;
    });

    return sortedConversations;
  }

  /**
   * Handles an event that updates the state of a conversation.
   *
   * @param {{
   *   type: string,
   *   data: {
   *     timestamp: number,
   *     conversationId: string,
   *     user?: string,
   *     subject?: string,
   *     body?: string
   *   }
   * }} event
   * @returns {void}
   */
  handleEvent(event: ConversationEvent): void {
    const { type, data } = event;
    const { timestamp, conversationId, user, subject, body } = data;

    /*Type is handled in the switch case below.
    Here we handle if timestamp and conversationId are missing in the event
    User,subject and body are optional so no need to check for them
    for now I am doing it in console.warn but in production we can use a logger or we can throw an error*/
    if (!timestamp) {
      console.warn('Event is missing a timestamp:', event);
      return;
    }
    if (!conversationId) {
      console.warn('Event is missing a conversationId:', event);
      return;
    }

    /*If we get this particalar convesation in the conversations map
    then we ccheck if the timestamp is greater than the lastUpdatedTimestamp
    only If it is greater then we can update the conversation else we can ignore the event*/
    let conversation = this.conversations.get(conversationId);
    if (conversation && conversation.id === conversationId && conversation.lastUpdatedTimestamp > timestamp) {
      return;
    }

    /*Create a unique event ID based on the conversationId and timestamp.
     Instead of modifying this.conversations map let us create a new uniqueEvents set*/
    const eventId = `${conversationId}-${timestamp}`;
    if (this.uniqueEvents.has(eventId)) {
      /* Event may be received more than once.
       This means the application can receive an event that has all the same values
       (including timestamp) as a previously received event.*/
      console.log('Event already processed:', eventId);
      return;
    }

    this.uniqueEvents.add(eventId);

    if (!conversation) {
      this.conversations.set(conversationId, {
        id: conversationId,
        ...defaultConversation,
      });
    }
    conversation = this.conversations.get(conversationId) as Conversation;

    switch (type) {
      case EventType.MessageReceived:
        /*If the subject is not provided, it will be set to the previous subject
        The subject of the most recent message of the conversation or the subject of the conversation if not provided*/
        conversation.subject = subject || conversation.subject;
        /* conversation.blurb = (body || conversation.blurb).slice(0, 256);
        We increment the message count by 1 for this conversation*/
        conversation.messageCount += 1;

        if (!this.typingUsers.has(conversationId) || this.typingUsers.get(conversationId)?.size === 0) {
          //If no users are typing, the first 256 characters of the body of the most recent message
          conversation.blurb = body?.slice(0, 256) || conversation.blurb;
        } else {
          this.lastBody.set(conversationId, body || '');
        }

        break;

      case EventType.Assigned:
        /*The conversation was assigned to the specified user
        Name of the user assigned to the conversation, or null if the conversation is not assigned*/
        conversation.assignedUser = user || null;
        break;

      case EventType.Unassigned:
        //The conversation is unassigned from the specified user
        conversation.assignedUser = null;
        break;

      case EventType.TypingStarted:
        conversation.blurb = this.addAndgetBlurbForTypingUsers(conversationId, user);
        break;

      case EventType.TypingStopped:
        conversation.blurb = this.deleteBlurbForTypingUsers(conversationId, conversation, user);
        break;

      default:
        /* The application can receive an event type that is not listed above.
         If all cases are handled above then 'type' should be 'never' here */
        const typeNotExists: never = type;
        console.warn('Unknown event type:', typeNotExists);
        /* If the event type is not found
        then we can remove the eventId from the uniqueEvents set and conversations map */
        this.uniqueEvents.delete(eventId);
        conversation = undefined;
        this.isConversationEmptyThenRemove(conversationId);

        return;
    }

    //Timestamp is added for each event if not then it is caught at the top of the function
    conversation.lastUpdatedTimestamp = timestamp;
  }

  getBlurbForTypingUsers(conversationId: string): string {
    let typingUsers = Array.from(this.typingUsers.get(conversationId) || []);
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is replying...`;
    }
    return typingUsers.length > 1 ? `${typingUsers.join(', ')} are replying...` : '';
  }

  addAndgetBlurbForTypingUsers(conversationId: string, user?: string): string {
    const typingUser = this.typingUsers.get(conversationId) ?? new Set<string>();
    if (user) {
      this.typingUsers.set(conversationId, typingUser.add(user));
    }
    return this.getBlurbForTypingUsers(conversationId);
  }

  deleteBlurbForTypingUsers(conversationId: string, conversation: Conversation, user?: string) {
    //If the users have stopped typing then we need to remove the user from the typingUsers map
    if (this.typingUsers.has(conversationId)) {
      let found = this.typingUsers.get(conversationId);
      if (found && user) {
        found.delete(user);
      }
      if (this.typingUsers.get(conversationId)?.size === 0) {
        this.typingUsers.delete(conversationId);
        return this.lastBody.get(conversationId) || '';
      } else {
        let typingUsers = Array.from(this.typingUsers.get(conversationId) || []);
        if (typingUsers.length === 1) {
          return `${typingUsers[0]} is replying...`;
        }
        return typingUsers.length > 1 ? `${typingUsers.join(', ')} are replying...` : '';
      }
    }
    return '';
  }

  isConversationEmptyThenRemove(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return true;
    }

    // Ensure that defaultConversation and conversation are properly typed as Conversation
    const isEmpty = Object.keys(defaultConversation).every((key) => {
      // Use keyof Conversation to type the key
      return (
        key === 'id' ||
        conversation[key as keyof Conversation] === defaultConversation[key as keyof Omit<Conversation, 'id'>]
      );
    });

    if (isEmpty) {
      this.conversations.delete(conversationId);
    }

    return isEmpty;
  }
}
