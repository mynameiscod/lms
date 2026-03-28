@echo off
echo 🚀 Starting LMS Build Process...

echo.
echo 🛑 Stopping existing containers...
docker-compose down

echo.
echo 🗑️ Removing old images and building fresh...
docker-compose build --no-cache

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed! Check the errors above.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting containers...
docker-compose up -d

echo.
echo ⏳ Waiting for containers to start...
timeout /t 5 /nobreak > nul

echo.
echo 📊 Container Status:
docker-compose ps

echo.
echo 📝 Server Logs (last 50 lines):
docker-compose logs --tail=50 server

echo.
echo ⏳ Waiting for application to be ready...
timeout /t 10 /nobreak > nul

echo.
echo 🧪 Testing application health...
curl -s -o nul -w "HTTP Status: %%{http_code}" http://localhost:5000
echo.

echo.
echo ✅ Build and deployment complete!
echo 🌐 Application should be available at: http://localhost:5000
echo 📊 To view logs: docker-compose logs -f server  
echo 🛑 To stop: docker-compose down
echo.
pause