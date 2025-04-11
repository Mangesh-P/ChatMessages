# front-end exercise

## Introduction

This is a real-time collaborative platform. It uses an event stream to keep data synchronized between team members.

Your goal in this exercise is to build the data layer of a front-end application. This data layer will store information about conversations and the messages that belong to each conversation. Your code will consume a stream of events by updating the application state according to these events, and then use the application state to return an updated list of conversations.

## Spec

The starting code for the data layer is located in `src/store/store.js`. You should make all your changes in `src/store/*`. You _should not_ make any changes to `index.html`, `src/socket/*`, and `src/main.js`. You may add additional packages, although this shouldn't be necessary.

`Store#handleEvent` in `src/store/store.js` is called for each event received by the application. You must implement this method to handle the event object and update the state of your application according to _Events_ below.

Once you've handled the event, `Store#getConversations` in `src/store/store.js` is called to get the current list of conversations. You must implement this method to return an array of conversation objects according to _Conversations_ below.

### Events

An event is an object containing the following properties:

| Property              | Type              | Description                                           |
| --------------------- | ----------------- | ----------------------------------------------------- |
| `type`                | String            | Event type (see below)                                |
| `data`                | Object            |                                                       |
| `data.timestamp`      | Number            | Time the event happened                               |
| `data.conversationId` | String            | ID of the conversation the event belongs to           |
| `data.user`           | String (optional) | Name of the user related to the event (if applicable) |
| `data.subject`        | String (optional) | Subject of the message (if applicable)                |
| `data.body`           | String (optional) | Body of the message (if applicable)                   |

You must handle the following event types:

| Event type        | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `messageReceived` | A new message with `subject` and `body` was received on the conversation |
| `assigned`        | The conversation was assigned to the specified `user`                    |
| `unassigned`      | The conversation was unassigned                                          |
| `typingStarted`   | The specified `user` started typing a reply                              |
| `typingStopped`   | The specified `user` stopped typing a reply                              |

**You must gracefully handle the following edge cases (how is up to you):**

- The application can receive an event `type` that is not listed above.
- Event may be received more than once. This means the application can receive an event that has all the same values (including `timestamp`) as a previously received event.
- Events may be received in a different order than the order in which they happened. This means the application can receive events with a `timestamp` that is older than that of a previously received event.

### Conversations

Each conversation in the array returned by `Store#getConversations` must be a plain JavaScript object containing the following properties:

| Property              | Type           | Description                                                                                                                                                                                                                                                           |
| --------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | String         | Conversation ID                                                                                                                                                                                                                                                       |
| `assignedUser`        | String or Null | Name of the user assigned to the conversation, or `null` if the conversation is not assigned                                                                                                                                                                          |
| `subject`             | String         | The subject of the most recent message of the conversation                                                                                                                                                                                                            |
| `blurb`               | String         | <ul><li>If no users are typing, the first 256 characters of the body of the most recent message</li><li>If one user is typing, the string `${user} is replying...`</li><li>If two or more users are typing, the string `${user1}, ${user2} are replying...`</li></ul> |
| `messageCount`        | Number         | Number of messages in the conversation event                                                                                                                                                                                                                          |
| `lastUpdateTimestamp` | Number         | Time the conversation was most recently updated                                                                                                                                                                                                               |

**The array of conversations must follow these rules:**

- The conversations must be in reverse chronological order according to their `lastUpdateTimestamp`. This means the most recently updated conversation should be the first conversation in the array.
- A conversation _must not_ be included in the array while it is assigned to `John_Doe`.

```jsonc
// Example return value from Store#getConversations:
[
  {
    "id": "c3baea01",
    "assignedUser": null,
    "subject": "Re: Recusandae quis",
    "blurb": "Russ_Barton is replying...",
    "messageCount": 3,
    "lastUpdateTimestamp": 1650865243985
  }
]
```

## Getting Started

1. Install the project dependencies with `npm install`.
2. Run the server with `npm start`.
3. Open the front-end application by going to [http://localhost:3000](http://localhost:3000)

The project contains a development server serving a front-end client application. The application automatically refreshes when you make changes to the source code. The development server supports both JavaScript and TypeScript.

## Expectations

The goal of this exercise is _not_ to get the correct output and you will _not_ be graded for any view layer or UI changes you make.

Instead, the goal is to demonstrate your software engineering abilities, including:

- Understanding a new problem
- Implementing a well-engineered solution (as opposed to something that works by accident)
- Making pragmatic technical decisions
- Justifying the decisions you make
