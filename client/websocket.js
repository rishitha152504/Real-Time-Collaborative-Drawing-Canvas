/**
 * websocket.js
 * WebSocket client using Socket.io. Connects to server, sends drawing events,
 * receives real-time updates and user list. Cursor positions and undo/redo
 * are handled here and forwarded to canvas and UI.
 */

(function (global) {
  'use strict';

  let socket = null;
  let myUserId = null;
  let myUserColor = null;
  let myUserName = null;

  /** Online users: userId -> { id, name, color } */
  const users = new Map();
  /** Remote cursors: userId -> { x, y, color, name } (normalized 0-1) */
  const cursors = new Map();

  let onInit = null;
  let onUserJoined = null;
  let onUserLeft = null;
  let onCursor = null;
  let onDrawStart = null;
  let onDrawPoint = null;
  let onDrawEnd = null;
  let onUndo = null;
  let onRedo = null;
  let onStatus = null;

  /**
   * Connect to server. Optionally pass userName in query.
   * @param {string} [baseUrl] - e.g. window.location.origin
   * @param {{ userName?: string }} [opts]
   */
  function connect(baseUrl, opts) {
    const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const userName = (opts && opts.userName) || 'User';
    socket = io(url, {
      query: { userName },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      if (onStatus) onStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      if (onStatus) onStatus('disconnected');
    });

    socket.on('init', (data) => {
      myUserId = data.userId;
      myUserColor = data.userColor;
      myUserName = data.userName || 'You';
      users.clear();
      if (Array.isArray(data.users)) {
        data.users.forEach((u) => users.set(u.id, u));
      }
      if (onInit) onInit(data);
    });

    socket.on('user_joined', (user) => {
      users.set(user.id, user);
      if (onUserJoined) onUserJoined(user);
    });

    socket.on('user_left', (data) => {
      users.delete(data.userId);
      cursors.delete(data.userId);
      if (onUserLeft) onUserLeft(data.userId);
    });

    socket.on('cursor', (data) => {
      cursors.set(data.userId, {
        x: data.x,
        y: data.y,
        color: data.userColor,
        name: data.userName,
      });
      if (onCursor) onCursor(data);
    });

    socket.on('draw_start', (payload) => {
      if (onDrawStart) onDrawStart(payload);
    });

    socket.on('draw_point', (payload) => {
      if (onDrawPoint) onDrawPoint(payload);
    });

    socket.on('draw_end', (payload) => {
      if (onDrawEnd) onDrawEnd(payload);
    });

    socket.on('undo', (payload) => {
      if (onUndo) onUndo(payload);
    });

    socket.on('redo', (payload) => {
      if (onRedo) onRedo(payload);
    });
  }

  /**
   * Send draw_start to server.
   * @param {{ strokeId: string, tool: string, color: string, width: number }} payload
   */
  function sendDrawStart(payload) {
    if (socket && socket.connected) {
      socket.emit('draw_start', payload);
    }
  }

  /**
   * Send batched points (draw_point).
   * @param {{ strokeId: string, points: {x: number, y: number}[] }} payload
   */
  function sendDrawPoint(payload) {
    if (socket && socket.connected && payload.points && payload.points.length > 0) {
      socket.emit('draw_point', payload);
    }
  }

  /**
   * Send draw_end.
   * @param {{ strokeId: string }} payload
   */
  function sendDrawEnd(payload) {
    if (socket && socket.connected) {
      socket.emit('draw_end', payload);
    }
  }

  /**
   * Send cursor position (normalized 0-1). Throttled by caller if needed.
   * @param {number} x
   * @param {number} y
   */
  function sendCursor(x, y) {
    if (socket && socket.connected) {
      socket.emit('cursor', { x, y });
    }
  }

  function sendUndo() {
    if (socket && socket.connected) {
      socket.emit('undo');
    }
  }

  function sendRedo() {
    if (socket && socket.connected) {
      socket.emit('redo');
    }
  }

  /**
   * Register event callbacks.
   * @param {Object} handlers
   */
  function on(handlers) {
    onInit = handlers.init || null;
    onUserJoined = handlers.user_joined || null;
    onUserLeft = handlers.user_left || null;
    onCursor = handlers.cursor || null;
    onDrawStart = handlers.draw_start || null;
    onDrawPoint = handlers.draw_point || null;
    onDrawEnd = handlers.draw_end || null;
    onUndo = handlers.undo || null;
    onRedo = handlers.redo || null;
    onStatus = handlers.status || null;
  }

  function getUsers() {
    return [...users.values()];
  }

  function getCursors() {
    return cursors;
  }

  function getMyUserId() {
    return myUserId;
  }
  function getMyUserColor() {
    return myUserColor;
  }
  function getMyUserName() {
    return myUserName;
  }

  function isConnected() {
    return socket != null && socket.connected;
  }

  global.WebSocketModule = {
    connect,
    on,
    sendDrawStart,
    sendDrawPoint,
    sendDrawEnd,
    sendCursor,
    sendUndo,
    sendRedo,
    getUsers,
    getCursors,
    getMyUserId,
    getMyUserColor,
    getMyUserName,
    isConnected,
  };
})(typeof window !== 'undefined' ? window : this);
