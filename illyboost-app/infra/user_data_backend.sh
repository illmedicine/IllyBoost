#!/bin/bash
# Backend Server Setup Script for Oracle Cloud
# This runs automatically when the instance starts
# Variables: rdp_password (injected by Terraform)

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18
curl -sL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Git
apt-get install -y git

# Install xrdp and desktop environment for RDP access
export DEBIAN_FRONTEND=noninteractive
apt-get install -y xrdp xfce4 xfce4-goodies chromium-browser
adduser xrdp ssl-cert

# Configure xrdp to use xfce
echo "xfce4-session" > /home/ubuntu/.xsession
chown ubuntu:ubuntu /home/ubuntu/.xsession

# Set password for ubuntu user (provided via Terraform variable)
echo "ubuntu:${rdp_password}" | chpasswd

# Enable and start xrdp
systemctl enable xrdp
systemctl start xrdp

# Create app directory
mkdir -p /opt/illyboost
cd /opt/illyboost

# Clone repository from the actual GitHub repo
git clone https://github.com/illmedicine/IllyBoost.git . || {
  echo "Failed to clone repository" >> /tmp/setup.log
  exit 1
}
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
echo "Repository cloned from: https://github.com/illmedicine/IllyBoost.git" >> /tmp/setup.log
systemctl status illyboost-backend >> /tmp/setup.log 2>&1
systemctl status xrdp >> /tmp/setup.log 2>&1
