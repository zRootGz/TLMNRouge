@echo off
setlocal enabledelayedexpansion
title TLMN Activity - Discord Launcher
cd /d "%~dp0"

echo ====================================================
echo   KHOI DONG GAME SERVER VA CLOUDFLARE CHO DISCORD
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

rem 2. Kiem tra file cloudflared.exe
if not exist "cloudflared.exe" (
    echo [LOI] Khong tim thay file cloudflared.exe trong thu muc game!
    echo Vui long tai cloudflared.exe dat vao cung thu muc nay.
    echo.
    pause
    exit /b 1
)

rem 3. Giai phong cong 8080 neu bi chiem boi tien trinh cu
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING 2^>nul') do (
    echo [*] Dang dong tien trinh cu tren cong 8080 ^(PID: %%a^)...
    taskkill /f /pid %%a >nul 2>nul
)

echo [1/2] Dang khoi dong Game Server o cua so rieng...
start "TLMN Game Server (Port 8080)" cmd /k "cd /d ""%~dp0"" && node --experimental-strip-types src/index.ts"

timeout /t 2 >nul

echo [2/2] Dang mo duong ham Cloudflare Tunnel...
echo.
echo ====================================================
echo   HUONG DAN CAU HINH DISCORD EMBEDDED ACTIVITY:
echo ====================================================
echo  1. Tim dong co link dang: https://xxxx.trycloudflare.com
echo  2. Copy link do va vao Discord Developer Portal:
echo     https://discord.com/developers/applications
echo  3. Chon App cua ban ^> Vao muc URL Mappings:
echo     - Prefix: /
echo     - Target: Dan link https://circles-springs-impacts-buys.trycloudflare.com vao day
echo  4. Bam "Save Changes" va vao Discord bat Activity de choi!
echo ====================================================
echo.

cloudflared.exe tunnel --url http://localhost:8080

echo.
echo Duong ham Cloudflare da dong.
pause
