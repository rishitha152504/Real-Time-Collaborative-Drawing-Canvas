@echo off
REM Push to https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git not found. Install from https://git-scm.com/download/win
    pause
    exit /b 1
)

if not exist .git (
    echo Initializing repo...
    git init
    git add .
    git commit -m "Initial commit: Real-time collaborative drawing canvas"
    git branch -M main
    git remote add origin https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git
)

echo Pushing to GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo If the remote has existing content, run these two commands:
    echo   git pull origin main --allow-unrelated-histories
    echo   git push -u origin main
)

pause
