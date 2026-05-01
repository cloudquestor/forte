#!/bin/bash
set -e

echo "Setting up Forte for production deployment..."

# Install dependencies
apt update
apt install -y python3 python3-pip python3-venv nodejs npm nginx

# Create user
useradd -r -s /bin/false forte || true

# Create directories
mkdir -p /opt/forte
mkdir -p /opt/forte/data
mkdir -p /opt/forte/portal/dist
chown -R forte:forte /opt/forte

# Copy backend
cp -r backend /opt/forte/
chown -R forte:forte /opt/forte/backend

# Copy portal
cp -r portal /opt/forte/
chown -R forte:forte /opt/forte/portal

# Setup Python virtual environment
cd /opt/forte/backend
python3 -m venv ../venv
../venv/bin/pip install -r requirements.txt

# Build portal
cd /opt/forte/portal
npm install
npm run build

# Copy nginx config
cp /workspaces/forte/nginx.conf /etc/nginx/sites-available/forte
ln -sf /etc/nginx/sites-available/forte /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Copy environment file
cp /workspaces/forte/.env.example /opt/forte/.env
chown forte:forte /opt/forte/.env

# Copy systemd service
cp /workspaces/forte/forte-backend.service /etc/systemd/system/

# Reload systemd and enable services
systemctl daemon-reload
systemctl enable forte-backend
systemctl enable nginx

echo "Setup complete. Edit /opt/forte/.env with your configuration, then run:"
echo "sudo systemctl start forte-backend"
echo "sudo systemctl start nginx"