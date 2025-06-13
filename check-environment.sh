#!/bin/bash

# Script to check which environment you're currently in

echo "Checking current environment..."

if [ -d "/app" ] && [ -f "/etc/supervisor/conf.d/supervisord.conf" ]; then
    echo "✓ Development environment detected"
    echo "  - /app directory exists"
    echo "  - Supervisor configuration found"
    echo "  - Use: ./start-dev.sh to start services"
    echo "  - Or run: cd /app && supervisorctl start backend frontend"
elif [ -d "/backend" ] && [ -d "/usr/share/nginx/html" ]; then
    echo "✓ Production environment detected"
    echo "  - /backend directory exists"
    echo "  - Nginx html directory exists"
    echo "  - Services start automatically via entrypoint.sh"
    echo "  - No manual startup required"
else
    echo "❌ Unknown environment"
    echo "  - Neither development nor production environment detected"
    echo "  - Please check your Docker container setup"
fi

echo ""
echo "Current directory: $(pwd)"
echo "Available directories:"
ls -la /