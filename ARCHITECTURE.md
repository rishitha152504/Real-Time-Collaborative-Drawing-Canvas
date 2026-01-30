# Architecture: Collaborative Drawing Canvas

## 1. Data Flow Diagram

```
┌─────────────────┐                    ┌─────────────────┐
│   User A        │                    │   Server        │
│   (Browser)     │                    │   (Node.js)     │
│                 │  draw_start        │                 │
│  Canvas.js      │ ─────────────────► │  drawing-state  │
│  (pointer down) │  draw_point (batch)│  rooms          │
│                 │ ─────────────────► │                 │
│                 │  draw_end          │  Socket.io      │
│                 │ ─────────────────► │  broadcast      │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  init (strokes + users)              │
         │ ◄───────────────────────────────────┤
         │  draw_start / draw_point / draw_end  │
         │ ◄───────────────────────────────────┤  (to other clients)
         │  undo / redo                         │
         │ ◄───────────────────────────────────┤
         │  cursor                             │
         │ ◄───────────────────────────────────┤
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│   User B        │                    │   User C         │
│   (Browser)     │                    │   (Browser)      │
│   Sees A's      │                    │   Sees A's & B's │
│   stroke live   │                    │   strokes live   │
└─────────────────┘                    └─────────────────┘
```

**Flow summary**

1. **User draws**: Pointer events → `canvas.js` builds a path (points). On pointer down we send `draw_start`; on move we batch points and send `draw_point`; on pointer up we send `draw_end`.
2. **Server**: Appends strokes and points in `drawing-state.js`; broadcasts `draw_start`, `draw_point`, `draw_end` to other clients in the same room.
3. **Other clients**: On `draw_start` they create an in-progress stroke; on `draw_point` they append points and redraw; on `draw_end` they move that stroke to committed history. So everyone sees the stroke **while it is happening**.
4. **Undo/redo**: Any client sends `undo` or `redo`. Server updates its single source of truth (strokes + redo stack) and broadcasts the result so every client stays in sync.

---

## 2. WebSocket Protocol (Socket.io)

All coordinates are **normalized 0–1** (fraction of canvas width/height) so the same drawing scales across different resolutions.

### Client → Server

| Event         | Payload | Description |
|---------------|---------|-------------|
| (connect)     | query: `userName` | Optional display name. |
| `draw_start`  | `{ strokeId, tool, color, width }` | User started a stroke. |
| `draw_point`  | `{ strokeId, points: [{x,y}, ...] }` | Batched path points (normalized 0–1). |
| `draw_end`    | `{ strokeId }` | User finished the stroke. |
| `cursor`      | `{ x, y }` | Current cursor position (normalized 0–1). |
| `undo`        | — | Request global undo. |
| `redo`        | — | Request global redo. |

### Server → Client

| Event         | Payload | Description |
|---------------|---------|-------------|
| `init`        | `{ userId, userColor, userName, strokes, users }` | Sent once on connect: identity and full canvas state. |
| `user_joined` | `{ id, name, color }` | New user in room. |
| `user_left`   | `{ userId }` | User disconnected. |
| `draw_start`  | `{ strokeId, userId, userColor, tool, color, width }` | Another user started a stroke. |
| `draw_point`  | `{ strokeId, points }` | More points for an in-progress stroke. |
| `draw_end`    | `{ strokeId }` | Another user finished a stroke. |
| `cursor`      | `{ userId, userColor, userName, x, y }` | Another user’s cursor (normalized). |
| `undo`        | `{ strokeId }` | Last stroke was undone; client removes it. |
| `redo`        | `{ stroke }` | A stroke was redone; client adds it. |

---

## 3. Undo / Redo Strategy

- **Single source of truth**: The server holds the full ordered list of strokes and a redo stack in `drawing-state.js`.
- **Undo**: When the server receives `undo`, it pops the last stroke from the strokes array and pushes it onto the redo stack. It then broadcasts `undo` with that `strokeId`. Every client (including the one that requested undo) removes that stroke by `strokeId`. So **one user can undo another user’s drawing**; everyone sees the same state.
- **Redo**: When the server receives `redo`, it pops from the redo stack and pushes back onto the strokes array, then broadcasts `redo` with the full `stroke` object. All clients add that stroke. Redo only restores the most recently undone stroke (single redo step).
- **Order**: Undo/redo is global and ordered: the “last” stroke is the last one in the server’s strokes array, regardless of who drew it. No per-user undo stacks.

---

## 4. Performance Decisions

- **Path-based drawing**: We use `moveTo` + `lineTo` for each stroke instead of drawing many small segments. Fewer draw calls and smoother lines.
- **Batching points**: We don’t send every pointer move. We batch points (e.g. every ~32 ms) and send `draw_point` with an array of points. This reduces WebSocket traffic while keeping real-time feel.
- **Cursor throttle**: Cursor position is sent at most every ~50 ms to avoid flooding the server.
- **Redraw strategy**: On each change (new points, undo, redo, remote stroke), we clear the canvas and redraw all strokes from the in-memory list. For hundreds of strokes this is acceptable. For thousands we could add an offscreen “base” layer that is only redrawn when the committed stroke list changes, and draw only the current in-progress stroke on top.
- **Normalized coordinates**: Storing points in 0–1 keeps the same logical drawing across different canvas pixel sizes and makes serialization smaller than raw pixels.

---

## 5. Conflict Handling

- **Simultaneous drawing**: Multiple users can draw at the same time. Each stroke has a unique `strokeId`. The server appends strokes and points in order; it does not merge or reorder strokes. So there is no “conflict” in the sense of overwriting the same stroke; we have multiple independent strokes.
- **Overlapping strokes**: If two users draw over the same area, both strokes remain. Order is determined by the order in which `draw_end` is processed (and thus order in the server’s strokes array). No special conflict resolution (e.g. operational transforms) is used; the model is “append-only” strokes with global undo/redo.
- **Undo/redo**: The only shared mutation is undo/redo. The server serializes that: only one undo or redo is applied at a time, and the result is broadcast so all clients converge to the same list of strokes.

---

## 6. File Responsibilities

- **client/canvas.js**: Raw Canvas API only. Path building (points), drawing (moveTo/lineTo), local and remote stroke state, redraw. No network code.
- **client/websocket.js**: Socket.io connect, send/receive of all events, user and cursor maps. No canvas or DOM (except via callbacks).
- **client/main.js**: Wires canvas and WebSocket (callbacks), toolbar (tool, color, width), user list and remote cursors DOM, undo/redo buttons.
- **server/server.js**: Express static serve, Socket.io connection handling, delegation to rooms and drawing-state.
- **server/rooms.js**: One default room, user join/leave, per-user color assignment.
- **server/drawing-state.js**: Strokes array, redo stack, add stroke, append points, undo, redo.
