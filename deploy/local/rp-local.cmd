@echo off
setlocal EnableExtensions

rem RankPublish local tools — Windows CMD wrapper (no PowerShell execution policy required).
rem Usage:
rem   deploy\local\rp-local.cmd sync --site rankpublish-test
rem   deploy\local\rp-local.cmd cloud-tunnel

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
  call "%SCRIPT_DIR%setup-agent-access.cmd"
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="setup-ssh-key" (
  call "%SCRIPT_DIR%setup-agent-access.cmd"
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="agent-setup" (
  call "%SCRIPT_DIR%setup-agent-access.cmd"
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="agent-wp" (
  node "%REPO_ROOT%\deploy\local\create-wp-agent-user.cjs" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="cloud-tunnel" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%cloud-tunnel.ps1" %*
  exit /b %ERRORLEVEL%
)
if /I "%CMD%"=="write-tunnel-config" (
  node "%REPO_ROOT%\deploy\local\write-tunnel-config.cjs" %*
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
echo   agent-setup  Create Windows agent user + SSH key (Admin UAC once)
echo   agent-wp     Create WordPress admin + app password
echo   setup-ssh    Alias for agent-setup
echo   cloud-tunnel Open reverse SSH so Cloud Agents can reach LocalWP
echo.
echo Examples:
echo   .\rp-local.cmd sync --site rankpublish-test
echo   .\rp-local.cmd cloud-tunnel
echo   .\rp-local.cmd recover --site rankpublish --all
echo.
echo PowerShell note: use .\ prefix, e.g. .\rp-local.cmd sync --site rankpublish-test
echo.
exit /b 1
