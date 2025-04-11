import events from './events.json';

const streamingEventIntervalMs = 500;

/** Simulates events received from a server through a WebSocket connection. */
export class Socket {
  constructor() {
    this.isStreamingEvents = false;

    this._subscribers = [];
    this._isReceiveNextEventScheduled = false;
    this._nextEventIndex = 0;
  }

  subscribe(callback) {
    this._subscribers.push(callback);

    return () => {
      const index = this._subscribers.indexOf(callback);
      if (index !== -1) {
        this._subscribers.splice(index, 1);
      }
    };
  }

  startStreamingEvents() {
    this.isStreamingEvents = true;
    this._scheduleReceiveNextEvent();
  }

  stopStreamingEvents() {
    this.isStreamingEvents = false;
  }

  receiveNextEvent() {
    if (this._subscribers.length > 0 && this._nextEventIndex < events.length) {
      const event = events[this._nextEventIndex++];
      this._subscribers.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(error);
        }
      });
    }
  }

  _scheduleReceiveNextEvent() {
    if (this._isReceiveNextEventScheduled) {
      return;
    }

    setTimeout(() => {
      this._isReceiveNextEventScheduled = false;

      if (this.isStreamingEvents) {
        this.receiveNextEvent();
        this._scheduleReceiveNextEvent();
      }
    }, streamingEventIntervalMs);

    this._isReceiveNextEventScheduled = true;
  }
}
