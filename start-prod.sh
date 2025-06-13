#!/bin/bash
# Production environment startup script
# This should be run in the production container

# Check if we're in the correct environment
if [ ! -d "/backend" ]; then
    echo "Error: /backend directory not found. This script should be run in the production container."
    echo "Make sure you're running this inside the container built from the root Dockerfile"
    exit 1
fi

echo "Starting production services..."

# Start the backend in the background
cd /backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 &

# Start nginx in the foreground
nginx -g 'daemon off;'