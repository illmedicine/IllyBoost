#!/bin/bash
# Agent Setup Script for Oracle Cloud
# This runs automatically when the instance starts
# Variables: backend_host, agent_id, rdp_password (injected by Terraform)

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Python and pip
apt-get install -y python3 python3-pip git

# Install Chrome/Chromium
apt-get install -y chromium-browser

# Install WebSocket library
pip3 install websocket-client

# Install xrdp and desktop environment for RDP access
export DEBIAN_FRONTEND=noninteractive
apt-get install -y xrdp xfce4 xfce4-goodies
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
  echo "Failed to clone repository, creating minimal agent setup"
  mkdir -p illyboost-app/agent
  # Download just the agent.py file
  curl -sL https://raw.githubusercontent.com/illmedicine/IllyBoost/main/illyboost-app/agent/agent.py -o illyboost-app/agent/agent.py
}

# Set environment variables
cat > /etc/environment << EOF
BACKEND_WS="ws://${backend_host}:3002"
AGENT_ID="${agent_id}"
DISPLAY=":0"
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EOF

# Create systemd service file for auto-start
cat > /etc/systemd/system/illyboost-agent.service << EOF
[Unit]
Description=IllyBoost Agent
After=network.target xrdp.service
Wants=xrdp.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/illyboost/illyboost-app
ExecStart=/usr/bin/python3 agent/agent.py
Restart=on-failure
RestartSec=10

Environment="BACKEND_WS=ws://${backend_host}:3002"
Environment="AGENT_ID=${agent_id}"
Environment="DISPLAY=:0"

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable illyboost-agent
systemctl start illyboost-agent

# Log for debugging
echo "Agent setup complete" > /tmp/setup.log
echo "Backend WS: ws://${backend_host}:3002" >> /tmp/setup.log
echo "Agent ID: ${agent_id}" >> /tmp/setup.log
systemctl status illyboost-agent >> /tmp/setup.log 2>&1
systemctl status xrdp >> /tmp/setup.log 2>&1
