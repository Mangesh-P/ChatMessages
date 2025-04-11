import { Socket } from './socket/socket';
import { Store } from './store/store';

const socket = new Socket();
const store = new Store();
let eventCount = 0;

const toggleReceivingEventsButton = document.getElementById('toggle-receiving-events');
const receiveNextEventButton = document.getElementById('receive-next-event');
const eventCountElement = document.getElementById('event-count');
const conversationsJsonElement = document.getElementById('conversations-json');

function render() {
  toggleReceivingEventsButton.textContent = socket.isStreamingEvents
    ? 'Stop receiving events'
    : 'Start receiving events';

  eventCountElement.textContent = eventCount.toLocaleString();

  const conversations = store.getConversations();
  const conversationsJson = JSON.stringify(conversations, undefined, 2);
  conversationsJsonElement.textContent = conversationsJson;
}

socket.subscribe((event) => {
  eventCount++;
  store.handleEvent(event);
  render();
});

toggleReceivingEventsButton.addEventListener('click', () => {
  if (socket.isStreamingEvents) {
    socket.stopStreamingEvents();
  } else {
    socket.startStreamingEvents();
  }
  render();
});

receiveNextEventButton.addEventListener('click', () => {
  socket.receiveNextEvent();
});

render();
