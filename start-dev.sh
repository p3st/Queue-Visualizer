#!/bin/bash
# Development environment startup script
# This should be run inside the devcontainer

# Check if we're in the correct environment
if [ ! -d "/app" ]; then
    echo "Error: /app directory not found. This script should be run in the development container."
    echo "Make sure you're running this inside the devcontainer built from .devcontainer/Dockerfile"
    exit 1
fi

cd /app

# Check if supervisord is running
if ! pgrep supervisord > /dev/null; then
    echo "Starting supervisord..."
    supervisord -c /etc/supervisor/conf.d/supervisord.conf
    sleep 2
fi

# Start the services
echo "Starting backend and frontend services..."
supervisorctl start backend frontend

# Show status
supervisorctl status