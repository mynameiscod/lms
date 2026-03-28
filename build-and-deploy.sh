#!/bin/bash

# Build and Deploy Script with Better Error Handling
echo "🚀 Starting LMS Build Process..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images to force fresh build
echo "🗑️ Removing old images..."
docker-compose build --no-cache

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check the errors above."
    exit 1
fi

# Start the containers
echo "🚀 Starting containers..."
docker-compose up -d

# Wait a moment for containers to start
sleep 5

# Show container status
echo "📊 Container Status:"
docker-compose ps

# Show server logs to verify everything is working
echo "📝 Server Logs (last 50 lines):"
docker-compose logs --tail=50 server

# Test if the application is responding
echo "🧪 Testing application health..."
sleep 10

# Try to access the application
echo "🌐 Testing web application..."
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000 || echo "❌ Application not responding"

echo "✅ Build and deployment complete!"
echo "🌐 Application should be available at: http://localhost:5000"
echo "📊 To view logs: docker-compose logs -f server"
echo "🛑 To stop: docker-compose down"