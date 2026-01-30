# Deploy to Get Your Live Link

This project is deployed using **Railway**. The app runs as one Node.js service (Express + Socket.io).

---

## Step 1: Push your code to GitHub

Make sure your project is pushed to:

**https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas**

If not, run from the `collaborative-canvas` folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git
git push -u origin main
```

---

## Step 2: Deploy on Railway

1. **Sign up / Log in**  
   Go to **[https://railway.app](https://railway.app)** and sign in (GitHub login is easiest).

2. **New Project**  
   - Click **New Project**  
   - Choose **Deploy from GitHub repo**  
   - Select the repo: **rishitha152504/Real-Time-Collaborative-Drawing-Canvas**  
   - (If your app is in a subfolder like `collaborative-canvas`, set **Root Directory** to that folder in settings.)

3. **Configure**  
   Railway usually auto-detects Node.js. Ensure:
   - **Build Command:** `npm install` (or leave default)
   - **Start Command:** `npm start` (or `node server/server.js`)
   - **Root Directory:** Leave blank if `package.json` is at repo root; set to `collaborative-canvas` if the app is inside that folder.

4. **Generate domain**  
   - In your service, go to **Settings** → **Networking** → **Generate Domain**  
   - Railway will give you a URL like: `https://your-app.up.railway.app`

5. **Your deployed link**  
   That URL is your **deployed link**. Open it in the browser to use the app.

---

## Step 3: Test with multiple users

- Open the deployed link in one tab or device.
- Open the **same link** in another tab (or another browser/device).
- Draw in one tab; the other should update in real time.
- Use Undo/Redo; both tabs should stay in sync.

---

## Notes (Railway)

- **WebSockets:** Supported; real-time drawing works.
- **HTTPS:** Railway provides HTTPS automatically.
- **Environment:** Railway sets `PORT` automatically; the app uses `process.env.PORT`.

---

## After you have the link

Put it in your README and in your submission, for example:

- **Live demo:** [https://your-app.up.railway.app](https://collaborative-canvas-production-5205.up.railway.app/)

Replace with the actual URL Railway shows for your service.
