@echo off
chcp 65001 >nul
title Smart Room Search - Launcher
cd /d "%~dp0"

echo ============================================
echo   Smart Room Search - Dang mo Launcher...
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js. Cai Node.js truoc.
    pause
    exit /b 1
)

if not exist "%~dp0..\launcher.ps1" (
    echo [LOI] Khong tim thay launcher.ps1 ben canh open.bat
    pause
    exit /b 1
)

start "" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\launcher.ps1"
exit
