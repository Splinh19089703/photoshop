@echo off
title PhotoCraft AI Studio Launcher
echo =======================================================
echo          PhotoCraft AI Studio - SPLWorks
echo =======================================================
echo.
echo [1/3] Kiem tra moi truong Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] May chua cai dat Node.js! Vui long cai dat Node.js de tiep tuc.
    pause
    exit /b 1
)

echo [2/3] Khoi dong PhotoCraft AI Server tai http://localhost:4242 ...
start "" http://localhost:4242

echo [3/3] Dang chay may chu AI Companion...
cd /d "%~dp0ptscraft-ai"
node server.js

pause
