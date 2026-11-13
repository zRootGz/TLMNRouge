@echo off
setlocal enabledelayedexpansion
title TLMN Activity - Local Game Server
cd /d "%~dp0"

echo ====================================================
echo   TIEN LEN MIEN NAM BUFF - LOCAL GAME SERVER
echo ====================================================
echo.

rem 1. Kiem tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js tren may tinh!
    echo Vui long cai dat Node.js tu https://nodejs.org roi thu lai.
    echo.
    pause
    exit /b 1
)

rem 2. Giai phong cong 8080 neu bi chiem boi tien trinh cu
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING 2^>nul') do (
    echo [*] Dang dong tien trinh cu tren cong 8080 ^(PID: %%a^)...
    taskkill /f /pid %%a >nul 2>nul
)

echo [*] Dang khoi dong Game Server tai http://localhost:8080 ...
echo [*] Trinh duyet se tu dong mo sau 2 giay...
echo.
echo ====================================================
echo  Server Logs (Nhat ky may chu):
echo ====================================================

rem Mo trinh duyet sau 2 giay
start "" cmd /c "timeout /t 2 >nul && start http://localhost:8080"

rem Chay server truc tiep
node --experimental-strip-types src/index.ts

echo.
echo May chu da dung.
pause
