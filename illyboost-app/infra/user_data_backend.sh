#!/bin/bash
# Backend Server Setup Script for Oracle Cloud
# This runs automatically when the instance starts

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18
curl -sL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Git
apt-get install -y git

# Create app directory
mkdir -p /opt/illyboost
cd /opt/illyboost

# Clone repository (adjust URL as needed)
git clone https://github.com/yourusername/IllyBoost.git .
cd illyboost-app/backend

# Install dependencies
npm install

# Create systemd service file for auto-start
cat > /etc/systemd/system/illyboost-backend.service << EOF
[Unit]
Description=IllyBoost Backend Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/illyboost/illyboost-app/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable illyboost-backend
systemctl start illyboost-backend

# Log for debugging
echo "Backend setup complete" > /tmp/setup.log
systemctl status illyboost-backend >> /tmp/setup.log 2>&1
