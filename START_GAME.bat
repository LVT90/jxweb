@echo off
title JXWeb Launcher
color 0A
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     JXWeb - Võ Lâm Truyền Kỳ Web        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js chua duoc cai dat!
    echo        Tai ve tai: https://nodejs.org
    pause
    exit /b 1
)

:: Setup Environment for PAK data
set "JX_CLIENT_DIR=D:\hung dang\Client_VLTK_SHXT"
set "JX_PAK_DIR=D:\hung dang\Client_VLTK_SHXT\data"
set "JX_NPC_SETTINGS_DIR=D:\hung dang\Client_VLTK_SHXT\settings\npcres"
set "JX_SPAWN_MAPS_DIR=D:\hung dang\Client_VLTK_SHXT\settings\maps"
set "JX_PC_CITY_MAPS_DIR=D:\hung dang\Client_VLTK_SHXT\VLAuto\Maps\CityMaps"
set "HOST=0.0.0.0"
set "PORT=2567"

:: Start JXWeb Backend Server (PAK Streaming + Multi-Client + Gateway)
echo [1/2] Khoi dong JXWeb Backend Server (port 2567 - Streaming Kingsoft PAK)...
start "JXWeb Server (PAK Engine)" cmd /k "cd /d "%~dp0server" && node dist/index.js"

:: Wait a moment for server to initialize
timeout /t 3 /nobreak > nul

:: Start Web Client in new window
echo [2/2] Khoi dong Web Client (port 3000)...
start "JXWeb Client" cmd /k "cd /d "%~dp0client" && npm run dev"

:: Wait for client to start
timeout /t 3 /nobreak > nul

:: Open browser
echo [OK] Mo trinh duyet...
start http://localhost:3000

echo.
echo  Game dang chay tai : http://localhost:3000
echo  May chu Stream PAK : http://localhost:2567
echo.
echo  Moi tab tren trinh duyet = 1 client game doc lap!
echo.
pause
