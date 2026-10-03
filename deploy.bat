@echo off
title Cloudflare 1-Click Deploy - Kashpal Enterprises
color 0b

echo ======================================================
echo    KASHPAL ENTERPRISES - CLOUDFLARE 1-CLICK DEPLOY
echo ======================================================
echo.

:: Step 1: Check node_modules
if not exist "node_modules\" (
    echo [1/3] Installing dependencies (first time setup)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check internet connection.
        pause
        exit /b %errorlevel%
    )
) else (
    echo [1/3] Dependencies already installed.
)

echo.
:: Step 2: Build project into dist
echo [2/3] Building production package (Vite compile)...
call npx vite build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b %errorlevel%
)

echo.
:: Step 3: Direct Deploy to Cloudflare Pages
echo [3/3] Uploading 'dist' folder directly to Cloudflare Pages (project: kashpal)...
echo (Note: If this is your first time, Cloudflare will open a browser window to approve in 5 seconds)
echo.
call npx wrangler pages deploy dist --project-name=kashpal

if %errorlevel% equ 0 (
    echo.
    echo ======================================================
    echo    SUCCESS! WEBSITE DEPLOYED TO CLOUDFLARE PAGES!
    echo    Visit: https://kashpalenterprises.com
    echo    Or:    https://kashpal.pages.dev
    echo ======================================================
) else (
    echo.
    echo [NOTE] If Wrangler asked you to log in, please complete the browser login and run this again.
)

echo.
pause
