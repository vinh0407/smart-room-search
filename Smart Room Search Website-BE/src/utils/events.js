import { EventEmitter } from 'node:events';

export const ROOMS_CHANGED = 'rooms-changed';

export const roomEvents = new EventEmitter();

export const broadcastRoomsChange = () => {
  roomEvents.emit(ROOMS_CHANGED);
};