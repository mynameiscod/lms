@echo off
REM Quick Docker Deployment Script

echo.
echo =====================================
echo Docker Deployment Menu
echo =====================================
echo.
echo 1. Build and Start (Docker Compose)
echo 2. Stop Containers
echo 3. View Logs
echo 4. Restart Services
echo 5. Stop and Remove All
echo 6. View Running Containers
echo 7. Exit
echo.

set /p choice="Select option (1-7): "

if "%choice%"=="1" goto build_start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto remove_all
if "%choice%"=="6" goto status
if "%choice%"=="7" goto exit

echo Invalid choice!
pause
goto menu

:build_start
echo Building and starting containers...
cd /d "%~dp0"
docker-compose build
docker-compose up -d
echo.
echo ✓ Containers started!
echo Access at: http://localhost:3000
echo.
pause
goto menu

:stop
echo Stopping containers...
docker-compose stop
echo ✓ Containers stopped!
pause
goto menu

:logs
echo Showing logs (Press Ctrl+C to exit)...
docker-compose logs -f
pause
goto menu

:restart
echo Restarting services...
docker-compose restart
echo ✓ Services restarted!
pause
goto menu

:remove_all
echo Stopping and removing all containers...
docker-compose down -v
echo ✓ All containers removed!
pause
goto menu

:status
echo Running containers:
docker ps
echo.
pause
goto menu

:exit
exit /b 0

:menu
cls
echo.
echo =====================================
echo Docker Deployment Menu
echo =====================================
echo.
echo 1. Build and Start (Docker Compose)
echo 2. Stop Containers
echo 3. View Logs
echo 4. Restart Services
echo 5. Stop and Remove All
echo 6. View Running Containers
echo 7. Exit
echo.
set /p choice="Select option (1-7): "

if "%choice%"=="1" goto build_start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto remove_all
if "%choice%"=="6" goto status
if "%choice%"=="7" goto exit

echo Invalid choice!
pause
goto menu
