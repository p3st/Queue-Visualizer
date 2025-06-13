#!/bin/bash

# Development environment startup script
# This script should be run inside the development container

echo "Starting development environment..."

# Check if we're in the correct environment
if [ ! -d "/app" ]; then
    echo "Error: /app directory not found. This script should be run inside the development container."
    echo "Please build and run the development container first:"
    echo "  docker build -f .devcontainer/Dockerfile -t dev-container ."
    echo "  docker run -p 3000:3000 -p 8001:8001 -p 27017:27017 dev-container"
    exit 1
fi

cd /app

# Start services using supervisorctl
echo "Starting backend and frontend services..."
supervisorctl start backend frontend

echo "Services started. Backend should be available at http://localhost:8001"
echo "Frontend should be available at http://localhost:3000"