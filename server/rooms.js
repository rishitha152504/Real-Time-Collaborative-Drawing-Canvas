/**
 * rooms.js
 * Room handling: one room per "canvas". Users join default room.
 * Each room has its own drawing state and user list.
 */

const { createDrawingState } = require('./drawing-state');

/** @type {Map<string, { drawingState: ReturnType<typeof createDrawingState>, users: Map<string, { id: string, name: string, color: string }> }>} */
const rooms = new Map();

const DEFAULT_ROOM_ID = 'default';

/** Predefined colors for users (unique per user in room) */
const USER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4',
];

/**
 * Get or create a room.
 * @param {string} roomId
 */
function getOrCreateRoom(roomId = DEFAULT_ROOM_ID) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      drawingState: createDrawingState(),
      users: new Map(), // socketId -> { id, name, color }
    });
  }
  return rooms.get(roomId);
}

/**
 * Assign next available color in room.
 * @param {string} roomId
 * @returns {string} hex color
 */
function assignUserColor(roomId) {
  const room = getOrCreateRoom(roomId);
  const used = new Set([...room.users.values()].map((u) => u.color));
  for (const c of USER_COLORS) {
    if (!used.has(c)) return c;
  }
  return USER_COLORS[room.users.size % USER_COLORS.length];
}

/**
 * Add user to room. Returns user info including assigned color.
 * @param {string} roomId
 * @param {string} socketId
 * @param {string} userName
 * @returns {{ id: string, name: string, color: string }}
 */
function addUser(roomId, socketId, userName = 'User') {
  const room = getOrCreateRoom(roomId);
  const color = assignUserColor(roomId);
  const id = socketId;
  const name = userName || `User ${room.users.size + 1}`;
  room.users.set(socketId, { id, name, color });
  return { id, name, color };
}

/**
 * Remove user from room.
 * @param {string} roomId
 * @param {string} socketId
 */
function removeUser(roomId, socketId) {
  const room = rooms.get(roomId);
  if (room) room.users.delete(socketId);
}

/**
 * Get all users in room (for "who is online").
 * @param {string} roomId
 * @returns {{ id: string, name: string, color: string }[]}
 */
function getUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.users.values()];
}

/**
 * Update user cursor in room (stored per-socket in socket data; we don't persist cursors in rooms.js).
 * Cursors are sent via socket.io so we don't need to store them in room state.
 */
function getDrawingState(roomId) {
  const room = getOrCreateRoom(roomId);
  return room.drawingState;
}

module.exports = {
  getOrCreateRoom,
  addUser,
  removeUser,
  getUsers,
  getDrawingState,
  DEFAULT_ROOM_ID,
};
