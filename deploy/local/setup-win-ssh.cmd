@echo off
setlocal EnableExtensions
title RankPublish — SSH setup for Cloud Agent

rem Self-elevate to Administrator (one UAC click)
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Requesting Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%setup-win-ssh.ps1"
exit /b %ERRORLEVEL%
