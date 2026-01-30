/**
 * server.js
 * Express + Socket.io server. Serves static client and handles real-time drawing events.
 */

const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const {
  addUser,
  removeUser,
  getUsers,
  getDrawingState,
  DEFAULT_ROOM_ID,
} = require('./rooms');

const app = express();
const httpServer = createServer(app);

// Serve static files from client folder
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// Fallback: serve index.html for SPA-style routing (not used for multi-page)
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  const roomId = DEFAULT_ROOM_ID;
  const userName = socket.handshake.query.userName || `User ${socket.id.slice(0, 6)}`;
  const user = addUser(roomId, socket.id, userName);
  socket.join(roomId);
  socket.roomId = roomId;
  socket.userId = socket.id;
  socket.userName = user.name;
  socket.userColor = user.color;

  const drawingState = getDrawingState(roomId);

  // Send current state to the newly connected user
  socket.emit('init', {
    userId: socket.id,
    userColor: user.color,
    userName: user.name,
    strokes: drawingState.getStrokes(),
    users: getUsers(roomId),
    canUndo: drawingState.canUndo(),
    canRedo: drawingState.canRedo(),
  });

  // Tell others that this user joined
  socket.to(roomId).emit('user_joined', {
    id: user.id,
    name: user.name,
    color: user.color,
  });

  // --- Drawing events (real-time: stream points) ---

  socket.on('draw_start', (payload) => {
    const { strokeId, tool, color, width } = payload;
    if (!strokeId || !tool) return;
    drawingState.addStroke({
      id: strokeId,
      userId: socket.id,
      userColor: socket.userColor,
      tool: tool || 'brush',
      color: color || socket.userColor,
      width: typeof width === 'number' ? width : 4,
      points: [],
    });
    socket.to(roomId).emit('draw_start', {
      strokeId,
      userId: socket.id,
      userColor: socket.userColor,
      tool,
      color: color || socket.userColor,
      width: typeof width === 'number' ? width : 4,
    });
  });

  socket.on('draw_point', (payload) => {
    const { strokeId, points } = payload;
    if (!strokeId || !Array.isArray(points) || points.length === 0) return;
    drawingState.appendPoints(strokeId, points);
    socket.to(roomId).emit('draw_point', { strokeId, points });
  });

  socket.on('draw_end', (payload) => {
    const { strokeId } = payload || {};
    if (!strokeId) return;
    // Broadcast to ALL (including sender) so everyone gets canUndo/canRedo and Undo button enables
    io.to(roomId).emit('draw_end', {
      strokeId,
      canUndo: drawingState.canUndo(),
      canRedo: drawingState.canRedo(),
    });
  });

  // Cursor position (for "where others are drawing")
  socket.on('cursor', (payload) => {
    socket.to(roomId).emit('cursor', {
      userId: socket.id,
      userColor: socket.userColor,
      userName: socket.userName,
      x: payload.x,
      y: payload.y,
    });
  });

  // --- Global undo / redo ---

  socket.on('undo', () => {
    const removed = drawingState.undo();
    if (removed) {
      io.to(roomId).emit('undo', {
        strokeId: removed.id,
        canUndo: drawingState.canUndo(),
        canRedo: drawingState.canRedo(),
      });
    }
  });

  socket.on('redo', () => {
    const restored = drawingState.redo();
    if (restored) {
      io.to(roomId).emit('redo', {
        stroke: restored,
        canUndo: drawingState.canUndo(),
        canRedo: drawingState.canRedo(),
      });
    }
  });

  socket.on('disconnect', () => {
    removeUser(roomId, socket.id);
    socket.to(roomId).emit('user_left', { userId: socket.id });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Collaborative Canvas server running at http://localhost:${PORT}`);
});
