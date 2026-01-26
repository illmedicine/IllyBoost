#!/bin/bash
set -e

# Install Node.js 18
apt-get update
apt-get install -y ca-certificates curl gnupg
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=18
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs

# Write backend app
mkdir -p /opt/illyboost-backend
cat > /opt/illyboost-backend/package.json <<'PKG'
${file("../backend/package.json")}
PKG

cat > /opt/illyboost-backend/server.js <<'JS'
${file("../backend/server.js")}
JS

# Install dependencies
cd /opt/illyboost-backend
npm install --omit=dev

# Create self-signed cert for TLS
mkdir -p /opt/illyboost-backend/certs
if [ ! -f /opt/illyboost-backend/certs/key.pem ] || [ ! -f /opt/illyboost-backend/certs/cert.pem ]; then
  apt-get install -y openssl
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout /opt/illyboost-backend/certs/key.pem \
    -out /opt/illyboost-backend/certs/cert.pem \
    -days 365 \
    -subj "/CN=illyboost-backend"
fi

# Start backend (TLS enabled)
export PORT=3001
export SSL_KEY_PATH=/opt/illyboost-backend/certs/key.pem
export SSL_CERT_PATH=/opt/illyboost-backend/certs/cert.pem

AGENT_SECRET="${agent_secret}"
if [ -n "$AGENT_SECRET" ]; then
  export AGENT_SECRET="$AGENT_SECRET"
fi

nohup node /opt/illyboost-backend/server.js > /var/log/illyboost-backend.log 2>&1 &
