# Deploy to Get Your Live Link

Use **Render.com** (free tier) to get a deployed URL. The app runs as one Node.js service (Express + Socket.io).

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

## Step 2: Deploy on Render.com

1. **Sign up / Log in**  
   Go to **[https://render.com](https://render.com)** and sign in (GitHub login is easiest).

2. **New Web Service**  
   - Click **Dashboard** → **New** → **Web Service**  
   - Connect your GitHub account if asked and select the repo:  
     **rishitha152504/Real-Time-Collaborative-Drawing-Canvas**

3. **Configure the service**
   - **Name:** `collaborative-canvas` (or any name you like)
   - **Region:** Oregon (or nearest)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

4. **Create**  
   Click **Create Web Service**. Render will install dependencies and start the app.

5. **Wait for deploy**  
   First deploy can take 2–3 minutes. When the status is **Live**, the service is ready.

6. **Your deployed link**  
   At the top you’ll see a URL like:
   ```text
   https://collaborative-canvas-xxxx.onrender.com
   ```
   That is your **deployed link**. Open it in the browser to use the app.

---

## Step 3: Test with multiple users

- Open the deployed link in one tab or device.
- Open the **same link** in another tab (or another browser/device).
- Draw in one tab; the other should update in real time.
- Use Undo/Redo; both tabs should stay in sync.

---

## Notes (Render free tier)

- **Cold start:** After ~15 minutes of no traffic, the app sleeps. The first request may take 30–50 seconds; then it’s fast.
- **WebSockets:** Supported; real-time drawing works.
- **HTTPS:** Render gives you HTTPS automatically.

---

## Optional: One-click deploy with Blueprint

If your repo has `render.yaml`:

1. On Render: **New** → **Blueprint**.
2. Connect the repo **Real-Time-Collaborative-Drawing-Canvas**.
3. Render will read `render.yaml` and create the Web Service. Use the URL it gives you as your deployed link.

---

## After you have the link

Put it in your README and in your submission, for example:

- **Live demo:** https://collaborative-canvas-xxxx.onrender.com

Replace `xxxx` with the ID Render shows in your service URL.
