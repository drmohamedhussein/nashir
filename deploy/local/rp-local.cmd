@echo off
setlocal EnableExtensions

rem RankPublish local tools — Windows CMD wrapper (no PowerShell execution policy required).
rem Usage:
rem   deploy\local\rp-local.cmd sync --site rankpublish-test
rem   deploy\local\rp-local.cmd qa --site rankpublish-test

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%"

if "%~1"=="" goto :help
if /I "%~1"=="help" goto :help
if /I "%~1"=="-h" goto :help
if /I "%~1"=="--help" goto :help

set "CMD=%~1"
shift

if /I "%CMD%"=="fix-db" (
  node "%REPO_ROOT%\deploy\local\fix-wp-db.cjs" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="product" (
  node "%REPO_ROOT%\deploy\local\switch-product-mode.cjs" product %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="dev" (
  node "%REPO_ROOT%\deploy\local\switch-product-mode.cjs" dev %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="status" (
  node "%REPO_ROOT%\deploy\local\switch-product-mode.cjs" status %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="qa" (
  node "%REPO_ROOT%\deploy\local\qa-rankpublish.cjs" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="setup-test" (
  node "%REPO_ROOT%\deploy\local\setup-rankpublish-test.cjs" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="sync" (
  node "%REPO_ROOT%\deploy\local\sync-rankpublish-site.cjs" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="verify" (
  node "%REPO_ROOT%\deploy\local\verify-thinkrank-local.cjs" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="recover" (
  node "%REPO_ROOT%\deploy\local\recover-local-wp.cjs" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="setup-ssh" (
  call "%SCRIPT_DIR%setup-win-ssh.cmd"
  exit /b %ERRORLEVEL%
)

echo Unknown command: %CMD%
echo.
goto :help

:help
echo.
echo RankPublish local tools (CMD wrapper)
echo Repo: %REPO_ROOT%
echo.
echo Commands:
echo   fix-db     Fix wp-config DB connection
echo   product    Product-only mode + optional sync
echo   dev        Dev stack mode
echo   status     Show active plugins / mode
echo   qa         Automated QA checklist
echo   setup-test First-time test site setup
echo   sync       Sync rankpublish-site plugin to Local site
echo   verify     Verify local ThinkRank branding (no PHP required)
echo   recover    Fix HTTP 500 / imagick warnings / show PHP log
echo   setup-ssh  One-time OpenSSH setup for Cloud Agent (Admin UAC once)
echo.
echo Examples:
echo   .\rp-local.cmd sync --site rankpublish-test
echo   .\rp-local.cmd recover --site rankpublish --all
echo   .\rp-local.cmd qa --site rankpublish
echo.
echo PowerShell note: use .\ prefix, e.g. .\rp-local.cmd sync --site rankpublish-test
echo.
exit /b 1
