/**
 * canvas.js
 * Canvas drawing logic using raw HTML5 Canvas API only.
 * - Path-based drawing (moveTo, lineTo) for smooth strokes
 * - Strokes stored as arrays of points; redraw from history (no canvas libraries)
 * - Coordinates normalized 0-1 for resolution-independent drawing
 */

(function (global) {
  'use strict';

  /**
   * @typedef {Object} Stroke
   * @property {string} id
   * @property {string} userId
   * @property {string} userColor
   * @property {string} tool - 'brush' | 'eraser'
   * @property {string} color
   * @property {number} width
   * @property {{x: number, y: number}[]} points - normalized 0-1
   */

  let canvasEl;
  let ctx;
  let canvasWidth = 800;
  let canvasHeight = 600;

  /** @type {Stroke[]} */
  let strokes = [];
  /** Current stroke being drawn (local or remote in progress) @type {Stroke | null} */
  let currentStroke = null;
  /** In-progress strokes from other users (strokeId -> Stroke) */
  const pendingStrokes = new Map();

  let tool = 'brush';
  let color = '#3498db';
  let strokeWidth = 4;

  /** Callback when user starts a stroke (so we can send draw_start) */
  let onDrawStart = null;
  /** Callback when user adds points (so we can send draw_point) */
  let onDrawPoint = null;
  /** Callback when user ends stroke (so we can send draw_end) */
  let onDrawEnd = null;

  /** Throttle: batch points for network (ms) */
  const POINT_BATCH_MS = 32;
  let pointBatchTimeout = null;
  let pendingPoints = [];

  /**
   * Initialize canvas: get element, context, set size, bind pointer events.
   * @param {HTMLCanvasElement} el
   * @param {number} w
   * @param {number} h
   */
  function init(el, w, h) {
    canvasEl = el;
    ctx = el.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    canvasWidth = w;
    canvasHeight = h;
    el.width = w;
    el.height = h;
    bindEvents();
    redraw();
  }

  /**
   * Convert client coordinates to normalized 0-1 (relative to canvas).
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{x: number, y: number}}
   */
  function clientToNormalized(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;
    const x = (clientX - rect.left) * scaleX / canvasWidth;
    const y = (clientY - rect.top) * scaleY / canvasHeight;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }

  /**
   * Convert normalized 0-1 to canvas pixel coordinates.
   * @param {number} x
   * @param {number} y
   * @returns {{x: number, y: number}}
   */
  function normalizedToCanvas(x, y) {
    return { x: x * canvasWidth, y: y * canvasHeight };
  }

  /**
   * Draw a single stroke on ctx (path-based: moveTo + lineTo).
   * @param {CanvasRenderingContext2D} context
   * @param {Stroke} stroke
   */
  function drawStroke(context, stroke) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return;

    context.save();
    if (stroke.tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      context.strokeStyle = stroke.color || stroke.userColor || '#333';
    }
    context.lineWidth = stroke.width || 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const first = normalizedToCanvas(pts[0].x, pts[0].y);
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const p = normalizedToCanvas(pts[i].x, pts[i].y);
      context.lineTo(p.x, p.y);
    }
    context.stroke();
    context.restore();
  }

  /**
   * Redraw entire canvas: clear, then draw all strokes + current in-progress stroke(s).
   * Efficient: single clear, then iterate strokes (no per-stroke clear).
   */
  function redraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    for (const s of strokes) {
      drawStroke(ctx, s);
    }
    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }
    pendingStrokes.forEach((s) => drawStroke(ctx, s));
  }

  function bindEvents() {
    if (!canvasEl) return;

    const onPointerDown = (e) => {
      e.preventDefault();
      const pt = clientToNormalized(e.clientX, e.clientY);
      const strokeId = 'stroke-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
      currentStroke = {
        id: strokeId,
        userId: '',
        userColor: '',
        tool: tool,
        color: color,
        width: strokeWidth,
        points: [pt],
      };
      if (onDrawStart) {
        onDrawStart({ strokeId, tool, color, width: strokeWidth });
      }
      pendingPoints = [pt];
      flushPointBatch();
    };

    const onPointerMove = (e) => {
      e.preventDefault();
      if (!currentStroke) return;
      const pt = clientToNormalized(e.clientX, e.clientY);
      currentStroke.points.push(pt);
      pendingPoints.push(pt);
      redraw();
      schedulePointBatch();
    };

    const onPointerUp = (e) => {
      e.preventDefault();
      if (!currentStroke) return;
      flushPointBatch();
      if (onDrawEnd) onDrawEnd({ strokeId: currentStroke.id });
      strokes.push(currentStroke);
      currentStroke = null;
      redraw();
    };

    const onPointerLeave = (e) => {
      if (currentStroke) {
        onPointerUp(e);
      }
    };

    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointerleave', onPointerLeave);
  }

  function schedulePointBatch() {
    if (pointBatchTimeout) return;
    pointBatchTimeout = setTimeout(() => {
      pointBatchTimeout = null;
      flushPointBatch();
    }, POINT_BATCH_MS);
  }

  function flushPointBatch() {
    if (pendingPoints.length === 0) return;
    if (onDrawPoint && currentStroke) {
      onDrawPoint({ strokeId: currentStroke.id, points: pendingPoints.slice() });
    }
    pendingPoints.length = 0;
  }

  // --- Public API for main/websocket ---

  /**
   * Set drawing tool.
   * @param {string} t - 'brush' | 'eraser'
   */
  function setTool(t) {
    tool = t === 'eraser' ? 'eraser' : 'brush';
  }

  /**
   * Set stroke color (hex).
   * @param {string} c
   */
  function setColor(c) {
    color = c;
  }

  /**
   * Set stroke width (pixels).
   * @param {number} w
   */
  function setStrokeWidth(w) {
    strokeWidth = Math.max(1, Math.min(40, w));
  }

  /**
   * Register callbacks for drawing events (used by websocket.js).
   */
  function setDrawCallbacks(callbacks) {
    onDrawStart = callbacks.onDrawStart || null;
    onDrawPoint = callbacks.onDrawPoint || null;
    onDrawEnd = callbacks.onDrawEnd || null;
  }

  /**
   * Replace full strokes array (e.g. after init or undo/redo from server).
   * @param {Stroke[]} list
   */
  function setStrokes(list) {
    strokes = Array.isArray(list) ? list.map((s) => ({ ...s, points: s.points ? [...s.points] : [] })) : [];
    pendingStrokes.clear();
    currentStroke = null;
    redraw();
  }

  /**
   * Remote: another user started a stroke.
   * @param {{ strokeId: string, userId: string, userColor: string, tool: string, color: string, width: number }} payload
   */
  function remoteDrawStart(payload) {
    const s = {
      id: payload.strokeId,
      userId: payload.userId,
      userColor: payload.userColor,
      tool: payload.tool || 'brush',
      color: payload.color || payload.userColor,
      width: payload.width || 4,
      points: [],
    };
    pendingStrokes.set(payload.strokeId, s);
    redraw();
  }

  /**
   * Remote: another user added points (real-time).
   * @param {{ strokeId: string, points: {x: number, y: number}[] }} payload
   */
  function remoteDrawPoint(payload) {
    const stroke = pendingStrokes.get(payload.strokeId);
    if (stroke && Array.isArray(payload.points)) {
      stroke.points.push(...payload.points);
      redraw();
    }
  }

  /**
   * Remote: another user finished a stroke. Move from pending to committed.
   * @param {{ strokeId: string }} payload
   */
  function remoteDrawEnd(payload) {
    const stroke = pendingStrokes.get(payload.strokeId);
    if (stroke) {
      pendingStrokes.delete(payload.strokeId);
      strokes.push(stroke);
      redraw();
    }
  }

  /**
   * Global undo: remove last stroke (by id from server).
   * @param {{ strokeId: string }} payload
   */
  function undoStroke(payload) {
    const idx = strokes.findIndex((s) => s.id === payload.strokeId);
    if (idx !== -1) strokes.splice(idx, 1);
    else pendingStrokes.delete(payload.strokeId);
    redraw();
  }

  /**
   * Global redo: add restored stroke (from server).
   * @param {{ stroke: Stroke }} payload
   */
  function redoStroke(payload) {
    if (payload.stroke) {
      strokes.push({ ...payload.stroke, points: payload.stroke.points ? [...payload.stroke.points] : [] });
      redraw();
    }
  }

  /**
   * Get canvas dimensions (for cursor normalization).
   */
  function getSize() {
    return { width: canvasWidth, height: canvasHeight };
  }

  global.CanvasModule = {
    init,
    setTool,
    setColor,
    setStrokeWidth,
    setDrawCallbacks,
    setStrokes,
    remoteDrawStart,
    remoteDrawPoint,
    remoteDrawEnd,
    undoStroke,
    redoStroke,
    getSize,
  };
})(typeof window !== 'undefined' ? window : this);
