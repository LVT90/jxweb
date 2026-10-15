@echo off
title Vo Lam Idle Offline - Server
cd /d "%~dp0"
echo ===================================================
echo     VO LAM IDLE OFFLINE - PC CLIENT UI
echo ===================================================
echo.
echo Dang khoi dong may chu local tai cong 8765...
start "" "http://127.0.0.1:8765/index.html"
python START_GAME.py
pause
