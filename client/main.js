/**
 * main.js
 * App startup: wire canvas, WebSocket, toolbar, user list, cursors, and global undo/redo.
 */

(function () {
  'use strict';

  const CanvasModule = window.CanvasModule;
  const WebSocketModule = window.WebSocketModule;

  if (!CanvasModule || !WebSocketModule) {
    console.error('CanvasModule or WebSocketModule not loaded.');
    return;
  }

  const canvasEl = document.getElementById('canvas');
  const statusEl = document.getElementById('status');
  const myColorEl = document.getElementById('my-color');
  const myNameEl = document.getElementById('my-name');
  const usersListEl = document.getElementById('users-list');
  const cursorsLayerEl = document.getElementById('cursors');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const strokeWidthInput = document.getElementById('stroke-width');
  const strokeWidthValue = document.getElementById('stroke-width-value');
  const toolBrush = document.getElementById('tool-brush');
  const toolEraser = document.getElementById('tool-eraser');
  const colorPaletteEl = document.getElementById('color-palette');

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  const COLORS = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4',
    '#000000', '#ffffff',
  ];

  let cursorThrottle = 0;
  const CURSOR_THROTTLE_MS = 50;

  // --- Canvas init and draw callbacks ---

  CanvasModule.init(canvasEl, CANVAS_WIDTH, CANVAS_HEIGHT);

  CanvasModule.setDrawCallbacks({
    onDrawStart: (payload) => {
      WebSocketModule.sendDrawStart(payload);
    },
    onDrawPoint: (payload) => {
      WebSocketModule.sendDrawPoint(payload);
    },
    onDrawEnd: (payload) => {
      WebSocketModule.sendDrawEnd(payload);
    },
  });

  // --- WebSocket event handlers ---

  WebSocketModule.on({
    init: (data) => {
      CanvasModule.setStrokes(data.strokes || []);
      myColorEl.style.backgroundColor = data.userColor || '#999';
      myNameEl.textContent = data.userName || 'You';
      updateUsersList();
      updateUndoRedoButtons(data);
    },
    user_joined: () => updateUsersList(),
    user_left: () => {
      updateUsersList();
      renderCursors();
    },
    cursor: () => renderCursors(),
    draw_start: (payload) => CanvasModule.remoteDrawStart(payload),
    draw_point: (payload) => CanvasModule.remoteDrawPoint(payload),
    draw_end: (payload) => {
      CanvasModule.remoteDrawEnd(payload);
      updateUndoRedoButtons(payload);
    },
    undo: (payload) => {
      CanvasModule.undoStroke(payload);
      updateUndoRedoButtons(payload);
    },
    redo: (payload) => {
      CanvasModule.redoStroke(payload);
      updateUndoRedoButtons(payload);
    },
    status: (state) => {
      statusEl.textContent = state === 'connected' ? 'Connected' : 'Disconnected';
      statusEl.className = state === 'connected' ? 'connected' : 'disconnected';
    },
  });

  // --- Cursor position (throttled): send so others see where you are drawing ---

  function sendCursorPosition(clientX, clientY) {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;
    const x = Math.max(0, Math.min(1, ((clientX - rect.left) * scaleX) / canvasEl.width));
    const y = Math.max(0, Math.min(1, ((clientY - rect.top) * scaleY) / canvasEl.height));
    WebSocketModule.sendCursor(x, y);
  }

  function onCanvasPointerMove(e) {
    if (!canvasEl || !cursorsLayerEl) return;
    const now = Date.now();
    if (now - cursorThrottle < CURSOR_THROTTLE_MS) return;
    cursorThrottle = now;
    sendCursorPosition(e.clientX, e.clientY);
  }

  function onCanvasPointerEnter(e) {
    sendCursorPosition(e.clientX, e.clientY);
  }

  canvasEl.addEventListener('pointermove', onCanvasPointerMove);
  canvasEl.addEventListener('pointerenter', onCanvasPointerEnter);

  // --- Render remote cursors (normalized 0-1 -> pixel position in wrapper) ---

  function renderCursors() {
    if (!cursorsLayerEl || !canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const wrapper = cursorsLayerEl.parentElement;
    if (!wrapper) return;
    const wr = wrapper.getBoundingClientRect();
    const scaleX = rect.width / canvasEl.width;
    const scaleY = rect.height / canvasEl.height;
    const myId = WebSocketModule.getMyUserId();
    const cursors = WebSocketModule.getCursors();
    let html = '';
    cursors.forEach((data, userId) => {
      if (userId === myId) return;
      const px = rect.left - wr.left + data.x * rect.width;
      const py = rect.top - wr.top + data.y * rect.height;
      const name = (data.name || 'User').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      const color = data.color || '#333';
      html += `<div class="remote-cursor" data-user="${userId}" style="left:${px}px;top:${py}px;color:${color}"><span class="name">${name}</span></div>`;
    });
    cursorsLayerEl.innerHTML = html;
  }

  // --- Users list ---

  function updateUsersList() {
    if (!usersListEl) return;
    const users = WebSocketModule.getUsers();
    const myId = WebSocketModule.getMyUserId();
    usersListEl.innerHTML = users
      .map(
        (u) =>
          `<span class="user-chip${u.id === myId ? ' you' : ''}" data-user="${u.id}"><span class="dot" style="background:${u.color}"></span>${u.id === myId ? 'You' : u.name}</span>`
      )
      .join('');
  }

  // --- Undo / Redo (global): server is source of truth; we request and then receive broadcast ---

  function updateUndoRedoButtons(payload) {
    const connected = WebSocketModule.isConnected();
    if (btnUndo) {
      btnUndo.disabled = !connected || (payload && payload.canUndo === false);
    }
    if (btnRedo) {
      btnRedo.disabled = !connected || (payload && payload.canRedo === false);
    }
  }

  btnUndo.addEventListener('click', () => {
    WebSocketModule.sendUndo();
  });
  btnRedo.addEventListener('click', () => {
    WebSocketModule.sendRedo();
  });

  // --- Toolbar: tool, color, stroke width ---

  toolBrush.addEventListener('click', () => {
    CanvasModule.setTool('brush');
    toolBrush.classList.add('active');
    if (toolEraser) toolEraser.classList.remove('active');
  });
  toolEraser.addEventListener('click', () => {
    CanvasModule.setTool('eraser');
    toolEraser.classList.add('active');
    if (toolBrush) toolBrush.classList.remove('active');
  });

  COLORS.forEach((c) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = c;
    swatch.title = c;
    if (c === '#3498db') swatch.classList.add('selected');
    swatch.addEventListener('click', () => {
      CanvasModule.setColor(c);
      colorPaletteEl.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    colorPaletteEl.appendChild(swatch);
  });

  strokeWidthInput.addEventListener('input', () => {
    const w = parseInt(strokeWidthInput.value, 10);
    strokeWidthValue.textContent = w;
    CanvasModule.setStrokeWidth(w);
  });

  // --- Connect ---

  WebSocketModule.connect(undefined, { userName: 'User' });
})();
