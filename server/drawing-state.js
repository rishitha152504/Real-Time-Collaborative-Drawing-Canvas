/**
 * drawing-state.js
 * Server-side drawing state: strokes history, redo stack, and operations.
 * Single source of truth for the canvas. All clients sync to this state.
 */

/**
 * A single stroke: points drawn in one continuous gesture.
 * @typedef {Object} Stroke
 * @property {string} id - Unique stroke ID (UUID)
 * @property {string} userId - User who drew it
 * @property {string} userColor - Color assigned to that user (for display)
 * @property {string} tool - 'brush' | 'eraser'
 * @property {string} color - Stroke color (hex)
 * @property {number} width - Stroke width in pixels
 * @property {{x: number, y: number}[]} points - Path points (normalized 0-1)
 */

/**
 * Create a new DrawingState manager for a room.
 * Holds strokes array and redo stack for global undo/redo.
 */
function createDrawingState() {
  /** @type {Stroke[]} */
  const strokes = [];
  /** @type {Stroke[]} */
  const redoStack = [];

  return {
    /**
     * Add a new stroke (draw_start). Called when user starts drawing.
     * @param {Omit<Stroke, 'points'> & { points?: {x: number, y: number}[] }} stroke
     */
    addStroke(stroke) {
      const s = {
        id: stroke.id,
        userId: stroke.userId,
        userColor: stroke.userColor,
        tool: stroke.tool,
        color: stroke.color,
        width: stroke.width,
        points: stroke.points ? [...stroke.points] : [],
      };
      strokes.push(s);
      return s;
    },

    /**
     * Append points to an existing stroke (draw_point). Real-time streaming.
     * @param {string} strokeId
     * @param {{x: number, y: number}[]} points
     */
    appendPoints(strokeId, points) {
      const stroke = strokes.find((s) => s.id === strokeId);
      if (stroke && Array.isArray(points)) {
        stroke.points.push(...points);
      }
    },

    /**
     * Get full strokes array (for initial sync and after undo/redo).
     */
    getStrokes() {
      return strokes;
    },

    /**
     * Global undo: remove last stroke, push to redo stack.
     * @returns {Stroke | null} The removed stroke, or null if nothing to undo
     */
    undo() {
      if (strokes.length === 0) return null;
      const removed = strokes.pop();
      redoStack.push(removed);
      return removed;
    },

    /**
     * Global redo: restore last undone stroke.
     * @returns {Stroke | null} The restored stroke, or null if nothing to redo
     */
    redo() {
      if (redoStack.length === 0) return null;
      const restored = redoStack.pop();
      strokes.push(restored);
      return restored;
    },

    /**
     * Find stroke by id (e.g. to append points).
     * @param {string} strokeId
     * @returns {Stroke | undefined}
     */
    getStroke(strokeId) {
      return strokes.find((s) => s.id === strokeId);
    },

    canUndo() {
      return strokes.length > 0;
    },
    canRedo() {
      return redoStack.length > 0;
    },
  };
}

module.exports = { createDrawingState };
