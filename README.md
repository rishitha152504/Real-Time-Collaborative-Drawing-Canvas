# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where users draw on a shared canvas in real time. When one user draws, others see it **while it is happening**. Built with raw HTML5 Canvas API, Node.js, and Socket.io.

## Live Demo

After deploying (see [DEPLOY.md](./DEPLOY.md)), add your live URL here:

- **Live demo:** `https://your-app-name.onrender.com`

## Features

- **Drawing tools**: Brush, Eraser, multiple colors, adjustable stroke width
- **Real-time sync**: Strokes stream as points; others see drawing live
- **User indicators**: Remote cursors and names; online users list with unique colors
- **Conflict handling**: Multiple users can draw simultaneously; each stroke is independent (last-write-wins per stroke)
- **Global undo/redo**: Any user can undo or redo the last action; state is synchronized for everyone
- **User management**: Online users list; each user gets a unique color

## Tech Stack

- **Frontend**: Vanilla JavaScript, raw HTML5 Canvas API (no drawing libraries)
- **Backend**: Node.js, Express, Socket.io
- **No canvas libraries**: Only `CanvasRenderingContext2D` (moveTo, lineTo, stroke, etc.)

## Install and Run

### Prerequisites

- Node.js (v14 or later)
- npm

### Steps

1. Clone or download the project and go to the project folder:
   ```bash
   cd collaborative-canvas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open the app in your browser:
   - **http://localhost:3000**

The server serves the client files from the `client` folder and listens on port 3000 (or `process.env.PORT`).

## Testing with Multiple Users

1. Start the server with `npm start`.
2. Open **http://localhost:3000** in one browser tab (User 1).
3. Open **http://localhost:3000** in another tab or another browser/device on the same network (User 2).
4. Draw on the canvas in one tab; the other tab should show the stroke in real time.
5. Use Undo in one tab; the last stroke should disappear for both.
6. Use Redo; the stroke should reappear for both.
7. Check the header for “Online” users and colored cursors when moving the mouse on the canvas.

### Optional: Different “users” in one machine

- Use multiple browser profiles, or
- Use Chrome + Firefox + Edge, or
- Use a normal window and an incognito/private window

Each will get a different Socket.io connection and appear as a separate user.

## Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js       # Canvas drawing (raw Canvas API)
│   ├── websocket.js    # Socket.io client
│   └── main.js         # App startup, toolbar, cursors, undo/redo
├── server/
│   ├── server.js       # Express + Socket.io server
│   ├── rooms.js        # Room and user management
│   └── drawing-state.js # Strokes and undo/redo state
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## Known Issues / Limitations

- **Single room**: All users share one canvas (default room). Multi-room support is not implemented.
- **No persistence**: Drawings are lost when the server restarts.
- **No auth**: No login; users are identified by socket ID and optional query `userName`.
- **Undo/redo scope**: Only the last action can be undone/redone (single undo/redo step).
- **Eraser**: Implemented as destination-out on the same canvas; very thick strokes may be slow on large canvases.

## Browsers

Tested on modern Chrome, Firefox, and Safari. Requires support for:

- HTML5 Canvas
- ES5+ JavaScript
- WebSockets (Socket.io falls back to polling if needed)

## Time Spent (Example)

- Design and protocol: ~1 hour  
- Server (Express, Socket.io, rooms, drawing state): ~1.5 hours  
- Client (canvas, tools, real-time sync, cursors): ~2 hours  
- Undo/redo and edge cases: ~1 hour  
- README and ARCHITECTURE: ~0.5 hour  

**Total (example):** ~6 hours. Your actual time may vary.

## Deploy to Get Your Live Link

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step deployment on **Render.com** (free). You’ll get a URL like `https://collaborative-canvas-xxxx.onrender.com` — that’s your deployed link for the assignment.

## License

MIT.
