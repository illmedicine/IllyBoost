#!/bin/bash
# Start script for IllyBoost agent in Docker
# Starts virtual display (Xvfb) and the Python agent

# Start Xvfb in the background
Xvfb :99 -screen 0 1920x1080x24 &

# Wait for Xvfb to start
sleep 2

# Run the agent
exec python3 /app/agent.py
