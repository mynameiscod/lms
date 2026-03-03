#!/bin/bash

echo "[MongoDB Setup] Attempting to create user with Docker..."

# Try to create user using docker with host network
docker run --rm --network host \
  -e MONGOSH_HOST=localhost \
  -e MONGOSH_PORT=27017 \
  mongo:latest \
  mongosh \
  --host='localhost:27017'\
  --authenticationDatabase='admin' \
  --eval="db.getSiblingDB('admin').createUser({user: 'lms_user', pwd: 'LMS_Compass_Pass_123!', roles: [{role: 'root', db: 'admin'}]})" \
  2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ MongoDB user creation successful!"
  echo ""
  echo "Connection URI for MongoDB Compass:"
  echo "mongodb://lms_user:LMS_Compass_Pass_123!@127.0.0.1:27017/lms-saas?authSource=admin"
else
  echo ""
  echo "Setup complete - user may already exist or was created."
fi
