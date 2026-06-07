@echo off
chcp 65001 >nul
echo.
echo  正在启动 Yan Portfolio Server...
echo.

cd /d "%~dp0"
node server.js

pause
