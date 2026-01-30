# Push This Project to GitHub

Your repo: **https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git**

Run these commands in a terminal **from inside the `collaborative-canvas` folder**.  
You need **Git** installed ([download](https://git-scm.com/download/win) if needed).

---

## Option A: Run commands manually

Open **PowerShell** or **Command Prompt**, then:

```powershell
cd "c:\Users\rohit\OneDrive\Music\Desktop\Drawing\collaborative-canvas"
```

Then run:

```powershell
git init
git add .
git commit -m "Initial commit: Real-time collaborative drawing canvas"
git branch -M main
git remote add origin https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git
git push -u origin main
```

If the repo already has content (e.g. a README), use:

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## Option B: Use the script

From the `collaborative-canvas` folder run:

```powershell
.\push-to-github.ps1
```

---

## Authentication

- **HTTPS:** When you `git push`, Git will ask for your GitHub username and **Personal Access Token** (not your password). Create one: GitHub → Settings → Developer settings → Personal access tokens.
- **SSH:** If you use SSH keys, set the remote to:  
  `git@github.com:rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git`  
  and use:  
  `git remote set-url origin git@github.com:rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git`

---

## What gets pushed

- All source code (`client/`, `server/`)
- `package.json`, `package-lock.json`
- `README.md`, `ARCHITECTURE.md`
- `.gitignore` (so `node_modules/` is not pushed)
