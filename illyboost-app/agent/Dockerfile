# IllyBoost Agent Dockerfile
# Runs the Python agent that connects to the backend and opens URLs in Chrome

FROM python:3.11-slim

# Install Chrome and dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    chromium \
    chromium-driver \
    xvfb \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy agent code
COPY agent.py /app/
COPY start.sh /app/

# Make start script executable
RUN chmod +x /app/start.sh

# Install Python dependencies
RUN pip install --no-cache-dir websocket-client

# Set up virtual display for headless Chrome
ENV DISPLAY=:99

# Default command - use start.sh to run Xvfb and agent
CMD ["/bin/bash", "/app/start.sh"]
