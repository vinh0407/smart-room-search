@echo off
chcp 65001 >nul
title Smart Room Search - Mo App
cd /d "%~dp0"

echo ============================================
echo   Smart Room - Mo App (khong mo trinh duyet)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js. Cai Node.js truoc.
    pause
    exit /b 1
)

set "BE_DIR=C:\VisualStudio\Smart Room Search Website\Smart Room Search Website-BE"

echo [1/3] Kiem tra Backend port 4000...
netstat -ano | findstr /c:":4000 " | findstr LISTENING >nul 2>nul
if errorlevel 1 (
    if exist "%BE_DIR%\src\server.js" (
        echo       - BE chua chay - dang khoi dong node src/server.js...
        start "Smart Room BE port 4000" cmd /k "pushd ""%BE_DIR%"" && node src/server.js && popd"
    ) else (
        echo [LOI] Khong tim thay BE server.js
        pause
        exit /b 1
    )
) else (
    echo       - BE da chay san port 4000, bo qua.
)

echo [2/3] Kiem tra Admin dev server...
netstat -ano | findstr /c:":5173 " | findstr LISTENING >nul 2>nul
if errorlevel 1 (
    if exist "%~dp0package.json" (
        echo       - Admin chua chay - dang khoi dong npm run dev...
        start "Smart Room Admin dev" cmd /k "pushd ""%~dp0"" && npm run dev && popd"
    ) else (
        echo [LOI] Khong tim thay package.json trong Admin
    )
) else (
    echo       - Admin da chay san port 5173, bo qua.
)

echo [3/3] Cho Admin san sang...
set /a tries=0
:waitloop
netstat -ano | findstr /c:":5173 " | findstr LISTENING >nul 2>nul
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% GEQ 60 goto timeout
timeout /t 1 /nobreak >nul
goto waitloop

:ready
echo       - Admin san sang. Dang mo app...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$edge = @('C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe','C:\Program Files\Microsoft\Edge\Application\msedge.exe','C:\Program Files\Google\Chrome\Application\chrome.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1; if ($edge) { Start-Process $edge -ArgumentList '--app=http://localhost:5173' } else { Start-Process 'http://localhost:5173' }"
exit

:timeout
echo [LOI] Admin khong san sang sau 60 giay. Mo thuong: http://localhost:5173
pause
exit