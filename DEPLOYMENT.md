# NZ Budget Calculator - Deployment Guide

## 📋 Table of Contents
- [Overview](#overview)
- [Current Server Setup](#current-server-setup)
- [Architecture](#architecture)
- [Required Files](#required-files)
- [Deployment Steps](#deployment-steps)
- [GitHub Actions Setup](#github-actions-setup)
- [SSL Configuration](#ssl-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

This document provides complete instructions for deploying the NZ Budget Calculator to your Unraid server at **budget.example.com**.

### Key Information
- **Server**: Unraid 7.0.1 (YOUR_SERVER_IP)
- **Domain**: budget.example.com
- **Backend Port**: 3200
- **Frontend**: Vue.js (static build)
- **Database**: SQLite
- **SSL**: Let's Encrypt wildcard cert (*.example.com)
- **Reverse Proxy**: multi-site-nginx container

---

## Current Server Setup

### Existing Infrastructure

```
/mnt/user/appdata/
├── multi-site-nginx/           # Reverse proxy (ports 9080/9443)
│   ├── conf.d/                 # Subdomain configs
│   │   ├── todo.conf
│   │   ├── trainer.conf
│   │   ├── mealplanner.conf
│   │   └── budget.conf         # TO BE CREATED
│   ├── ssl/                    # SSL certificates
│   │   └── live/example.com/
│   └── docker-compose.yml
├── letsencrypt/                # Let's Encrypt data
└── todo-app/                   # Example app structure
    ├── backend/
    ├── frontend/
    └── docker-compose.production.yml
```

### Port Allocations
- **3100**: gym-trainer backend
- **3101**: gym-trainer portal
- **3102**: gym-trainer admin
- **3200**: **AVAILABLE** ✅ (Budget app backend)
- **3500**: todo-app backend
- **3002**: meal-planning backend

---

## Architecture

### Request Flow

```
User Request (budget.example.com:443)
    ↓
Unraid nginx (port 443) → multi-site-nginx (port 9443)
    ↓
/mnt/user/appdata/multi-site-nginx/conf.d/budget.conf
    ↓
├─ /api/* → http://YOUR_SERVER_IP:3200 (Backend Docker Container)
└─ /*     → /usr/share/nginx/budget (Frontend Static Files)
```

### Components

1. **Frontend**: Vue.js SPA served as static files
2. **Backend**: Node.js Express API with SQLite database
3. **Reverse Proxy**: nginx routing requests
4. **SSL**: HTTPS via Let's Encrypt

---

## Required Files

### 1. Backend Dockerfile

**Location**: `backend/Dockerfile`

```dockerfile
FROM node:18-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3200

# Start the application
CMD ["node", "server.js"]
```

### 2. Docker Compose (Production)

**Location**: `docker-compose.production.yml`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: budget-backend
    restart: unless-stopped
    ports:
      - "3200:3200"
    volumes:
      - budget-data:/app/data
      - ./logs:/app/logs
    environment:
      NODE_ENV: production
      PORT: 3200
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: https://budget.example.com
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3200/api/verify"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

volumes:
  budget-data:
    driver: local
```

### 3. Nginx Subdomain Config

**Location**: Create on server at `/mnt/user/appdata/multi-site-nginx/conf.d/budget.conf`

```nginx
# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name budget.example.com;

    # Let's Encrypt webroot for certificate verification
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /usr/share/nginx/letsencrypt-webroot;
        allow all;
        try_files $uri =404;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name budget.example.com;

    # SSL certificates (shared wildcard cert)
    ssl_certificate /etc/nginx/ssl/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/example.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    root /usr/share/nginx/budget;
    index index.html;

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://YOUR_SERVER_IP:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. Environment Variables

**Location**: Create `.env` file on server at `/mnt/user/appdata/nz-budget-calculator/.env`

```env
JWT_SECRET=your-super-secret-jwt-key-here-change-this
NODE_ENV=production
PORT=3200
FRONTEND_URL=https://budget.example.com
```

### 5. .dockerignore

**Location**: `backend/.dockerignore`

```
node_modules
npm-debug.log
.env
.git
.gitignore
*.md
.vscode
.idea
*.db-shm
*.db-wal
logs/
```

### 6. Deployment Script

**Location**: `deploy.sh`

```bash
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
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Copy frontend dist to nginx volume
print_status "Updating frontend files..."
mkdir -p /mnt/user/appdata/nz-budget-calculator/frontend-dist
cp -r frontend/dist/* /mnt/user/appdata/nz-budget-calculator/frontend-dist/

# Reload nginx
print_status "Reloading nginx..."
docker exec multi-site-nginx nginx -s reload

print_success "Deployment complete!"
ENDSSH

print_success "✅ Budget app deployed successfully!"
echo ""
echo "Access your app at: https://budget.example.com"
```

---

## Deployment Steps

### Initial Setup (One-Time)

#### 1. Create App Directory on Server

```bash
ssh root@YOUR_SERVER_IP
mkdir -p /mnt/user/appdata/nz-budget-calculator
cd /mnt/user/appdata/nz-budget-calculator
```

#### 2. Create Nginx Config

```bash
cat > /mnt/user/appdata/multi-site-nginx/conf.d/budget.conf << 'EOF'
# [Paste the nginx config from above]
EOF
```

#### 3. Update multi-site-nginx docker-compose.yml

Add this volume mount to `/mnt/user/appdata/multi-site-nginx/docker-compose.yml`:

```yaml
volumes:
  # ... existing volumes ...
  - /mnt/user/appdata/nz-budget-calculator/frontend/dist:/usr/share/nginx/budget:rw
```

#### 4. Restart multi-site-nginx

```bash
cd /mnt/user/appdata/multi-site-nginx
docker-compose down
docker-compose up -d
```

#### 5. Create .env File

```bash
cd /mnt/user/appdata/nz-budget-calculator
cat > .env << 'EOF'
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
PORT=3200
FRONTEND_URL=https://budget.example.com
EOF
```

### Manual Deployment

#### 1. Build Frontend Locally

```bash
cd frontend
npm install
npm run build
```

#### 2. Copy Files to Server

```bash
# From project root
rsync -avz --exclude 'node_modules' --exclude '.git' \
    ./ root@YOUR_SERVER_IP:/mnt/user/appdata/nz-budget-calculator/
```

#### 3. Build and Start Backend

```bash
ssh root@YOUR_SERVER_IP

cd /mnt/user/appdata/nz-budget-calculator

# Build and start
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker logs -f budget-backend
```

#### 4. Verify Deployment

```bash
# Check backend health
curl http://YOUR_SERVER_IP:3200/api/verify

# Check nginx config
docker exec multi-site-nginx nginx -t

# Reload nginx
docker exec multi-site-nginx nginx -s reload
```

#### 5. Test Access

Visit: https://budget.example.com

---

## GitHub Actions Setup

### Create GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `SERVER_HOST`: `YOUR_SERVER_IP`
- `SERVER_USER`: `root`
- `SERVER_SSH_KEY`: (Your SSH private key)
- `JWT_SECRET`: (Generate with `openssl rand -base64 32`)

### GitHub Actions Workflow

**Location**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Build Frontend
      run: |
        cd frontend
        npm ci
        npm run build

    - name: Setup SSH
      run: |
        mkdir -p ~/.ssh
        echo "${{ secrets.SERVER_SSH_KEY }}" > ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa
        ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

    - name: Deploy to Server
      env:
        SERVER_USER: ${{ secrets.SERVER_USER }}
        SERVER_HOST: ${{ secrets.SERVER_HOST }}
        JWT_SECRET: ${{ secrets.JWT_SECRET }}
      run: |
        # Copy files to server
        rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.github' \
          ./ ${SERVER_USER}@${SERVER_HOST}:/mnt/user/appdata/nz-budget-calculator/

        # Deploy on server
        ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
        cd /mnt/user/appdata/nz-budget-calculator

        # Create .env if it doesn't exist
        if [ ! -f .env ]; then
          echo "JWT_SECRET=${JWT_SECRET}" > .env
          echo "NODE_ENV=production" >> .env
          echo "PORT=3200" >> .env
          echo "FRONTEND_URL=https://budget.example.com" >> .env
        fi

        # Build and restart backend
        docker-compose -f docker-compose.production.yml down
        docker-compose -f docker-compose.production.yml build
        docker-compose -f docker-compose.production.yml up -d

        # Reload nginx
        docker exec multi-site-nginx nginx -s reload || true

        echo "✅ Deployment complete!"
        ENDSSH

    - name: Verify Deployment
      run: |
        sleep 10
        ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
          "docker logs --tail 50 budget-backend"
```

### Testing GitHub Actions Locally

Install `act` to test workflows locally:

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash  # Linux

# Run workflow
act -s SERVER_HOST=YOUR_SERVER_IP \
    -s SERVER_USER=root \
    -s SSH_KEY="$(cat ~/.ssh/id_rsa)"
```

---

## SSL Configuration

### Existing SSL Certificate

Your server already has a Let's Encrypt wildcard certificate for `*.example.com`:
- Location: `/mnt/user/appdata/letsencrypt/live/example.com/`
- Email: your-email@example.com

The `multi-site-nginx` container mounts this certificate and uses it for all subdomains.

### No Additional SSL Setup Needed

Since you already have the wildcard certificate, **budget.example.com** will automatically use it. No additional configuration required!

### SSL Certificate Renewal

The certificate auto-renews via Let's Encrypt. Check renewal status:

```bash
# On server
cat /mnt/user/appdata/multi-site-nginx/ssl/renewal/example.com.conf
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker logs -f budget-backend

# Check if port is in use
netstat -tlnp | grep 3200

# Restart container
docker restart budget-backend
```

### Frontend Not Loading

```bash
# Check if files exist
ls -la /mnt/user/appdata/nz-budget-calculator/frontend/dist

# Verify nginx volume mount
docker inspect multi-site-nginx | grep budget

# Reload nginx
docker exec multi-site-nginx nginx -t
docker exec multi-site-nginx nginx -s reload
```

### Database Issues

```bash
# Check SQLite database
docker exec budget-backend ls -la /app/data

# Backup database
docker cp budget-backend:/app/data/budget.db ./budget.db.backup

# View database
docker exec -it budget-backend sqlite3 /app/data/budget.db ".tables"
```

### nginx Configuration Errors

```bash
# Test config
docker exec multi-site-nginx nginx -t

# View error logs
docker logs multi-site-nginx

# Restart nginx
cd /mnt/user/appdata/multi-site-nginx
docker-compose restart
```

### SSL Certificate Issues

```bash
# Check certificate
openssl s_client -connect budget.example.com:443 -servername budget.example.com

# View certificate expiry
docker exec multi-site-nginx openssl x509 -in /etc/nginx/ssl/live/example.com/fullchain.pem -noout -dates
```

### Port Conflicts

```bash
# Check what's using port 3200
docker ps | grep 3200
netstat -tlnp | grep 3200

# Kill process if needed
kill -9 <PID>
```

### Health Check Failures

```bash
# Manual health check
curl http://YOUR_SERVER_IP:3200/api/verify

# Check backend logs
docker logs budget-backend | grep -i error

# Restart with fresh logs
docker restart budget-backend && docker logs -f budget-backend
```

---

## Auto-Start on Server Reboot

The `restart: unless-stopped` policy in docker-compose ensures the container starts automatically on reboot.

### Verify Auto-Start

```bash
# Reboot test (WARNING: Will restart server)
ssh root@YOUR_SERVER_IP reboot

# After reboot, check if running
ssh root@YOUR_SERVER_IP "docker ps | grep budget"
```

---

## Monitoring & Maintenance

### Check Application Status

```bash
# Container status
docker ps | grep budget

# Resource usage
docker stats budget-backend

# Logs
docker logs --tail 100 -f budget-backend
```

### Database Backups

```bash
# Manual backup
docker exec budget-backend sqlite3 /app/data/budget.db ".backup '/app/data/budget.db.backup'"

# Automated backup (add to crontab)
0 2 * * * docker exec budget-backend sqlite3 /app/data/budget.db ".backup '/app/data/budget.db.backup-$(date +\%Y\%m\%d)'"
```

### Update Deployment

```bash
# Pull latest code
cd /mnt/user/appdata/nz-budget-calculator
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml up -d --build
```

---

## Quick Reference Commands

```bash
# Deploy from local machine
./deploy.sh

# SSH to server
ssh root@YOUR_SERVER_IP

# View backend logs
docker logs -f budget-backend

# Restart backend
docker restart budget-backend

# Reload nginx
docker exec multi-site-nginx nginx -s reload

# Check health
curl http://YOUR_SERVER_IP:3200/api/verify

# Access database
docker exec -it budget-backend sqlite3 /app/data/budget.db
```

---

## Support & Contact

- **GitHub**: https://github.com/your-username/nz-budget-calculator
- **Domain**: budget.example.com
- **Server IP**: YOUR_SERVER_IP
- **Backend Port**: 3200

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21
**Generated by**: Claude Code
