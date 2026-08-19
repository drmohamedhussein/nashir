@echo off
setlocal EnableExtensions
title RankPublish Agent Setup
cd /d "%~dp0"

net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Administrator required - click YES on UAC...
  powershell -NoProfile -Command "Start-Process powershell.exe -Verb RunAs -Wait -WorkingDirectory '%~dp0' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -NoExit -File \"%~dp0setup-agent-access.ps1\"'"
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0setup-agent-access.ps1"
exit /b %ERRORLEVEL%
