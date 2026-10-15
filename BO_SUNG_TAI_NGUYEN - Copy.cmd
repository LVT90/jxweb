@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py -3 BO_SUNG_TAI_NGUYEN.py & pause & exit /b)
python BO_SUNG_TAI_NGUYEN.py
pause
