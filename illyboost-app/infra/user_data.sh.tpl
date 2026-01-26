#!/bin/bash
set -e

# Install dependencies and agent
apt-get update
apt-get install -y python3 python3-pip wget unzip xvfb gnome-screenshot

pip3 install websocket-client

# Install Chrome
wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb || true
if [ -f /tmp/chrome.deb ]; then
  apt-get install -y /tmp/chrome.deb || true
fi

# Agent
cat > /opt/illyboost-agent.py <<'PY'
${file("../agent/agent.py")}
PY

# Run agent as service (simple nohup)
BACKEND_WS_DEFAULT="ws://${backend_host}:3002"
BACKEND_WS_OVERRIDE="${backend_ws}"
if [ -n "$BACKEND_WS_OVERRIDE" ]; then
  BACKEND_WS="$BACKEND_WS_OVERRIDE"
else
  BACKEND_WS="$BACKEND_WS_DEFAULT"
fi
AGENT_ID="${agent_id}"
# optional agent secret
AGENT_SECRET="${agent_secret}"
if [ -n "$AGENT_SECRET" ]; then
  export AGENT_SECRET="$AGENT_SECRET"
fi
export BACKEND_HOST="${backend_host}"
export BACKEND_WS="$BACKEND_WS"
export AGENT_ID="$AGENT_ID"
nohup python3 /opt/illyboost-agent.py > /var/log/illyboost-agent.log 2>&1 &
