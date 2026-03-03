@echo off
REM LMS-SAAS One-Click Deployment Script for Windows

echo.
echo =====================================
echo LMS-SAAS One-Click Deployment
echo =====================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell is required but not found!
    pause
    exit /b 1
)

REM Get the directory of this script
set SCRIPT_DIR=%~dp0

REM Navigate to the script directory
cd /d "%SCRIPT_DIR%"

REM Run the PowerShell deployment script
echo Starting deployment process...
echo.

powershell -ExecutionPolicy Bypass -File "deploy.ps1" -VpsHost "187.124.97.56" -VpsUser "root" -AppPath "/root/lms-saas"

echo.
echo =====================================
echo Deployment completed!
echo =====================================
echo.
pause
