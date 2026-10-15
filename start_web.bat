@echo off
chcp 65001 >nul
set "JX_CLIENT_DIR=D:\hung dang\Client_VLTK_SHXT"
set "JX_PAK_DIR=D:\hung dang\Client_VLTK_SHXT\data"
set "JX_NPC_SETTINGS_DIR=D:\hung dang\Client_VLTK_SHXT\settings\npcres"
set "JX_SPAWN_MAPS_DIR=D:\hung dang\Client_VLTK_SHXT\settings\maps"
set "JX_PC_CITY_MAPS_DIR=D:\hung dang\Client_VLTK_SHXT\VLAuto\Maps\CityMaps"
set "JX_MOBILE_CITY_MAPS_DIR=D:\File\Client\Resources\maps\CityMaps"
set "HOST=192.168.1.22"
set "PORT=2567"
cd /d "%~dp0server" || exit /b 1
call npm run dev
