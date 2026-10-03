# Cloudflare 1-Click Deploy for PowerShell
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   KASHPAL ENTERPRISES - CLOUDFLARE 1-CLICK DEPLOY" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/3] Installing dependencies with npm install..." -ForegroundColor Green
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        pause
        exit $LASTEXITCODE
    }
} else {
    Write-Host "[1/3] Dependencies already present." -ForegroundColor Green
}

# Step 2: Build project
Write-Host "`n[2/3] Building production package (Vite)..." -ForegroundColor Green
npx vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    pause
    exit $LASTEXITCODE
}

# Step 3: Deploy to Cloudflare
Write-Host "`n[3/3] Deploying 'dist' directly to Cloudflare Pages (kashpal)..." -ForegroundColor Green
npx wrangler pages deploy dist --project-name=kashpal

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n======================================================" -ForegroundColor Green
    Write-Host "   SUCCESS! WEBSITE DEPLOYED TO CLOUDFLARE PAGES!" -ForegroundColor Yellow
    Write-Host "   Visit: https://kashpalenterprises.com" -ForegroundColor Cyan
    Write-Host "   Or:    https://kashpal.pages.dev" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Green
}
