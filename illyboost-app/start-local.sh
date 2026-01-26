#!/bin/bash

# IllyBoost Production Launcher Script
# This script starts all components in the correct order

set -e

echo "=========================================="
echo "  IllyBoost - Production Launcher"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Install from: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Function to start backend
start_backend() {
    echo "Starting Backend Server..."
    cd backend
    
    # Install dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        echo "Installing backend dependencies..."
        npm install
    fi
    
    echo "Backend starting on port 3001..."
    echo "  REST API: http://localhost:3001"
    echo "  Agent WS: ws://localhost:3002"
    echo "  Frontend WS: ws://localhost:3003"
    echo ""
    
    # Start in background
    npm start > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    cd ..
}

# Function to start frontend
start_frontend() {
    echo ""
    echo "Starting Frontend..."
    cd frontend
    
    # Install dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    echo "Frontend starting on port 5173..."
    echo "  URL: http://localhost:5173"
    echo ""
    
    # Start in background
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "=========================================="
    echo "  Shutting down..."
    echo "=========================================="
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    echo "Shutdown complete."
    exit 0
}

# Set up trap to cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Main flow
echo "Starting IllyBoost components..."
echo ""

start_backend

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 3

start_frontend

echo ""
echo "=========================================="
echo "  ✓ IllyBoost is Running!"
echo "=========================================="
echo ""
echo "Frontend URL: http://localhost:5173"
echo "Backend API: http://localhost:3001"
echo ""
echo "To test with Docker agents:"
echo "  In another terminal, run:"
echo "  docker compose -f docker-compose.test.yml up --scale agent=3 --build"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait
