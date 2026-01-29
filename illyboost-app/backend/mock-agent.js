#!/usr/bin/env node
/**
 * IllyBoost Mock Agent
 * Simulates a real agent for local testing
 * Features: WebSocket connection, bandwidth simulation, screenshot generation
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const AGENT_ID = args[0] || `agent-${Math.random().toString(36).substr(2, 9)}`;
const AGENT_NUM = parseInt(args[1]) || 1;
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_WS = `ws://${BACKEND_HOST}:3002`;

let ws = null;
let currentRow = null;
let currentUrl = null;
let isRunning = false;

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[${AGENT_ID}]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[${AGENT_ID}]${colors.reset} ✓ ${msg}`),
  event: (msg) => console.log(`${colors.magenta}[${AGENT_ID}]${colors.reset} → ${msg}`),
  error: (msg) => console.log(`${colors.yellow}[${AGENT_ID}]${colors.reset} ⚠ ${msg}`),
};

function generateScreenshot(url) {
  /**
   * In production, this would use gnome-screenshot or similar
   * For demo, we generate a simple PNG-like base64 image
   */
  const width = 1280;
  const height = 720;
  const canvasData = Buffer.alloc(width * height * 4);
  
  // Fill with blue gradient
  for (let i = 0; i < canvasData.length; i += 4) {
    canvasData[i] = 100;     // R
    canvasData[i + 1] = 150; // G
    canvasData[i + 2] = 200; // B
    canvasData[i + 3] = 255; // A
  }
  
  // Add some "content" (simple pattern)
  for (let i = 0; i < 100; i += 4) {
    canvasData[i] = 255;
    canvasData[i + 1] = 200;
    canvasData[i + 2] = 100;
    canvasData[i + 3] = 255;
  }
  
  // Create minimal PNG header + data + convert to base64
  // For demo purposes, just send a simple PNG magic bytes + some data
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const combinedBuffer = Buffer.concat([pngHeader, canvasData]);
  
  return combinedBuffer.toString('base64');
}

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(BACKEND_WS);
      
      ws.on('open', () => {
        log.success('Connected to backend');
        
        // Register with backend
        const helloMsg = {
          type: 'hello',
          agentId: AGENT_ID,
          publicIp: `10.0.${AGENT_NUM}.${Math.floor(Math.random() * 256)}`,
          secret: '',
        };
        ws.send(JSON.stringify(helloMsg));
        log.event(`Registered as ${AGENT_ID}`);
        resolve();
      });
      
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          handleMessage(msg);
        } catch (e) {
          log.error(`Failed to parse message: ${e.message}`);
        }
      });
      
      ws.on('close', () => {
        log.info('Disconnected from backend');
        isRunning = false;
        // Reconnect after delay
        setTimeout(connectWebSocket, 3000);
      });
      
      ws.on('error', (err) => {
        log.error(`WebSocket error: ${err.message}`);
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function handleMessage(msg) {
  if (msg.type === 'open') {
    // Backend is telling us to open a URL
    const { rowId, url } = msg;
    log.event(`Received run command - row ${rowId}: ${url}`);
    currentRow = rowId;
    currentUrl = url;
    isRunning = true;
    simulateRun();
  }
}

async function simulateRun() {
  if (!isRunning || !currentRow || !currentUrl) return;
  
  try {
    // Simulate page loading
    log.event(`Loading ${currentUrl}...`);
    sendStatus('loading', null);
    await delay(1000);
    
    // Simulate page loading → processing
    log.event(`Processing...`);
    sendStatus('processing', null);
    await delay(1500);
    
    // Send initial bandwidth
    sendBandwidth(Math.random() * 5000000 + 1000000); // 1-6 MB/s
    
    // Simulate bandwidth updates for 3-5 seconds
    const duration = 3000 + Math.random() * 2000;
    const startTime = Date.now();
    
    while (isRunning && (Date.now() - startTime) < duration) {
      const elapsed = Date.now() - startTime;
      
      // Bandwidth curve: high initially, drops over time
      const factor = Math.max(0.3, 1 - elapsed / duration);
      const bandwidth = (Math.random() * 2000000 + 500000) * factor;
      
      sendBandwidth(bandwidth);
      await delay(500 + Math.random() * 500);
    }
    
    // Send final status
    sendStatus('done', null);
    log.event(`Completed`);
    
    // Send screenshot
    await delay(500);
    sendScreenshot();
    log.event(`Screenshot sent`);
    
    isRunning = false;
    
  } catch (e) {
    log.error(`Run failed: ${e.message}`);
    sendStatus('error', e.message);
    isRunning = false;
  }
}

function sendBandwidth(bytesPerSec) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  const msg = {
    type: 'bandwidth',
    agentId: AGENT_ID,
    rowId: currentRow,
    bytesPerSec: Math.round(bytesPerSec),
  };
  ws.send(JSON.stringify(msg));
}

function sendStatus(state, error) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  const msg = {
    type: 'status',
    agentId: AGENT_ID,
    rowId: currentRow,
    state: state,
    error: error,
  };
  ws.send(JSON.stringify(msg));
}

function sendScreenshot() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  const screenshot = generateScreenshot(currentUrl);
  const msg = {
    type: 'screenshot',
    rowId: currentRow,
    data: screenshot,
  };
  ws.send(JSON.stringify(msg));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log.info(`Starting mock agent ${AGENT_ID}...`);
  log.info(`Connecting to backend at ${BACKEND_WS}...`);
  
  try {
    await connectWebSocket();
    log.success('Mock agent ready and waiting for commands');
    
    // Keep running
    await new Promise(() => {});
  } catch (e) {
    log.error(`Failed to start: ${e.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.info('Shutting down...');
  if (ws) ws.close();
  process.exit(0);
});

main();
