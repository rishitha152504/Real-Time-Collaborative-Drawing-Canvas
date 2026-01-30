# Push Real-Time Collaborative Drawing Canvas to GitHub
# Run from: collaborative-canvas folder
# Repo: https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git

$ErrorActionPreference = "Stop"
$repo = "https://github.com/rishitha152504/Real-Time-Collaborative-Drawing-Canvas.git"

Write-Host "Checking Git..." -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git is not installed or not in PATH. Install from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

$root = $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
    git add .
    git commit -m "Initial commit: Real-time collaborative drawing canvas"
    git branch -M main
}

if (-not (git remote get-url origin 2>$null)) {
    Write-Host "Adding remote origin..." -ForegroundColor Cyan
    git remote add origin $repo
} else {
    $url = git remote get-url origin
    if ($url -ne $repo) {
        Write-Host "Setting remote origin to $repo" -ForegroundColor Cyan
        git remote set-url origin $repo
    }
}

Write-Host "Pushing to GitHub (main)..." -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "If the remote has existing content (e.g. README), run:" -ForegroundColor Yellow
    Write-Host "  git pull origin main --allow-unrelated-histories" -ForegroundColor Yellow
    Write-Host "  git push -u origin main" -ForegroundColor Yellow
    exit 1
}

Write-Host "Done. Repository: $repo" -ForegroundColor Green
