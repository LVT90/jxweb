@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Vo Lam Idle - Ban goc offline
where py >nul 2>nul
if %errorlevel%==0 (py -3 START_GAME.py & goto :eof)
where python >nul 2>nul
if %errorlevel%==0 (python START_GAME.py & goto :eof)
echo KHONG TIM THAY PYTHON. Chay thu index.html bang Chrome hoac Edge.
start "" "index.html"
pause
