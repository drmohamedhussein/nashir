@echo off
rem Sync rankpublish-site to Local sites + verify (no PHP required for verify step).
cd /d "%~dp0"
echo.
echo [1/3] git pull
git pull
echo.
echo [2/3] sync rankpublish + rankpublish-test
node deploy\local\sync-rankpublish-site.cjs --site rankpublish
node deploy\local\sync-rankpublish-site.cjs --site rankpublish-test
echo.
echo [3/3] verify (HTTP + files, no PHP)
node deploy\local\verify-thinkrank-local.cjs
echo.
echo Optional full QA (needs Local site Running):
echo   node deploy\local\doctor.cjs --site rankpublish
echo   node deploy\local\qa-rankpublish.cjs --site rankpublish
echo.
