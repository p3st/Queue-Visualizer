#!/bin/bash
# Script to check which environment you're in and provide appropriate commands

echo "Checking environment..."

if [ -d "/app" ] && [ -f "/etc/supervisor/conf.d/supervisord.conf" ]; then
    echo "✓ Development environment detected"
    echo "Use: ./start-dev.sh"
    echo "Or manually: cd /app && supervisorctl start backend frontend"
elif [ -d "/backend" ] && [ -d "/usr/share/nginx/html" ]; then
    echo "✓ Production environment detected"
    echo "Use: ./start-prod.sh"
    echo "Or manually run the entrypoint: /entrypoint.sh"
else
    echo "✗ Unknown environment"
    echo "Available directories:"
    ls -la /
fi