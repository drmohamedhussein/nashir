@echo off
setlocal EnableExtensions
title RankPublish — SSH setup for Cloud Agent
cd /d "%~dp0"

rem Already admin — run PowerShell and always pause
net session >nul 2>&1
if %errorLevel% equ 0 goto :run

echo.
echo RankPublish SSH setup — Administrator required.
echo A UAC window will appear. Click YES.
echo The setup window will stay open when finished.
echo.
powershell -NoProfile -Command "Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -WorkingDirectory '%~dp0' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -NoExit -File \"%~dp0setup-win-ssh.ps1\"'"
echo.
echo If the admin window closed too fast, open the log:
echo   %USERPROFILE%\.ssh\rankpublish-setup.log
echo.
pause
exit /b 0

:run
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0setup-win-ssh.ps1"
exit /b %ERRORLEVEL%
