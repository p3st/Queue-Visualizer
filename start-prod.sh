#!/bin/bash

# Production environment startup script
# This script should be run inside the production container

echo "Starting production environment..."

# Check if we're in the correct environment
if [ ! -d "/backend" ]; then
    echo "Error: /backend directory not found. This script should be run inside the production container."
    echo "Please build and run the production container first:"
    echo "  docker build -t prod-container ."
    echo "  docker run -p 80:80 prod-container"
    exit 1
fi

# The production container uses the entrypoint.sh script to start services
echo "Production environment uses entrypoint.sh to start nginx and uvicorn automatically."
echo "No manual service startup required."