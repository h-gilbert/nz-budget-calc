#!/bin/bash

# NZ Budget Calculator - Deployment Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 Deploying NZ Budget Calculator..."

# Configuration
SERVER_USER="root"
SERVER_HOST="YOUR_SERVER_IP"
APP_DIR="/mnt/user/appdata/nz-budget-calculator"
MULTI_NGINX_DIR="/mnt/user/appdata/multi-site-nginx"

# Build frontend
print_status "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Copy files to server
print_status "Copying files to server..."
rsync -avz --exclude 'node_modules' --exclude '.git' \
    ./ ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/

# Build and start backend
print_status "Building and starting backend..."
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd /mnt/user/appdata/nz-budget-calculator

# Build and restart backend
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Wait for backend to be healthy
echo "Waiting for backend to be healthy..."
sleep 10

# Check backend health
if curl -f http://YOUR_SERVER_IP:3200/api/verify > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed - checking logs..."
    docker logs --tail 20 budget-backend
fi

# Reload nginx
echo "Reloading nginx..."
docker exec multi-site-nginx nginx -t && docker exec multi-site-nginx nginx -s reload || echo "⚠️  nginx reload failed"

echo "✅ Deployment complete!"
ENDSSH

print_success "✅ Budget app deployed successfully!"
echo ""
echo "Access your app at: https://budget.example.com"
