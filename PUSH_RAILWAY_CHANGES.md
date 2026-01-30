# Push Railway deployment changes to GitHub

Run these commands from the **collaborative-canvas** folder (or from the repo root if that’s where your git repo is).

```bash
cd "c:\Users\rohit\OneDrive\Music\Desktop\Drawing\collaborative-canvas"
git add .
git status
git commit -m "Switch deployment docs from Render to Railway"
git push origin main
```

If your repo is one level up (in `Drawing`), run:

```bash
cd "c:\Users\rohit\OneDrive\Music\Desktop\Drawing"
git add .
git commit -m "Switch deployment docs from Render to Railway"
git push origin main
```

Use the folder that contains the `.git` directory.
