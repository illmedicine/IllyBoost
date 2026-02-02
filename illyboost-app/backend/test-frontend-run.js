#!/usr/bin/env node
/**
 * IllyBoost Frontend Run Diagnostic Test
 * 
 * This script simulates a complete frontend URL run flow to diagnose 
 * issues with Terraform/Docker/Oracle VM deployments.
 * 
 * What it does:
 * 1. Starts the backend server
 * 2. Connects a mock agent (simulating a VM agent)
 * 3. Sets random URLs in the rows
 * 4. Triggers a run via POST /run
 * 5. Monitors the flow and reports what happens at each step
 * 
 * Usage: node scripts/test-frontend-run.js
 */

const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 3001;
const AGENT_WS_PORT = process.env.AGENT_WS_PORT || 3002;
const FRONTEND_WS_PORT = process.env.FRONTEND_WS_PORT || 3003;
const DEFAULT_TIMEOUT_MS = 10000;

// Random test URLs
const TEST_URLS = [
  'https://example.com',
  'https://httpbin.org/get',
  'https://jsonplaceholder.typicode.com/posts/1',
  'https://api.github.com',
  'https://www.google.com',
  'https://www.wikipedia.org',
  'https://stackoverflow.com',
  'https://news.ycombinator.com',
];

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

const log = {
  step: (msg) => console.log(`\n${colors.bold}${colors.blue}=== ${msg} ===${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  event: (msg) => console.log(`${colors.magenta}→ ${msg}${colors.reset}`),
  data: (label, data) => console.log(`${colors.blue}[DATA]${colors.reset} ${label}:`, JSON.stringify(data, null, 2)),
};

// Helper: Make HTTP request
function httpRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BACKEND_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: DEFAULT_TIMEOUT_MS,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Helper: Connect WebSocket with detailed logging
function connectWS(port, label) {
  return new Promise((resolve, reject) => {
    const url = `ws://${BACKEND_HOST}:${port}`;
    log.info(`Connecting ${label} WebSocket to ${url}...`);
    
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`${label} WebSocket connection timeout`));
    }, DEFAULT_TIMEOUT_MS);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      log.success(`${label} WebSocket connected`);
      resolve(ws);
    });
    
    ws.on('error', (err) => {
      clearTimeout(timeout);
      log.error(`${label} WebSocket error: ${err.message}`);
      reject(err);
    });
  });
}

// Helper: Wait for a condition with timeout
async function waitFor(condition, timeout = 10000, interval = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return true;
    await delay(interval);
  }
  return false;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main diagnostic flow
async function runDiagnostics() {
  let backendProcess = null;
  let agentWS = null;
  let frontendWS = null;
  
  const diagnosticResults = {
    backendStart: null,
    healthCheck: null,
    agentConnection: null,
    agentRegistration: null,
    frontendConnection: null,
    urlUpdate: null,
    runTrigger: null,
    agentReceivedCommand: null,
    statusUpdates: [],
    bandwidthUpdates: [],
    errors: [],
  };
  
  try {
    log.step('PHASE 1: Backend Health Check');
    
    // Check if backend is already running
    try {
      const health = await httpRequest('GET', '/health');
      if (health.status === 200) {
        log.success('Backend is already running');
        diagnosticResults.backendStart = 'already_running';
        diagnosticResults.healthCheck = health.body;
        log.data('Health response', health.body);
      }
    } catch (e) {
      log.warn('Backend not running - will need to start it manually');
      log.info('Start backend with: cd illyboost-app/backend && npm start');
      diagnosticResults.backendStart = 'not_running';
      diagnosticResults.errors.push('Backend not running');
      
      // Wait a bit and retry
      log.info('Waiting 5 seconds for backend...');
      await delay(5000);
      
      try {
        const health = await httpRequest('GET', '/health');
        if (health.status === 200) {
          log.success('Backend is now running');
          diagnosticResults.backendStart = 'started';
          diagnosticResults.healthCheck = health.body;
        }
      } catch (e2) {
        log.error('Backend still not reachable. Please start the backend first.');
        throw new Error('Backend not reachable');
      }
    }
    
    log.step('PHASE 2: Mock Agent Connection');
    
    // Connect mock agent
    const agentId = `diag-agent-${Date.now()}`;
    agentWS = await connectWS(AGENT_WS_PORT, 'Agent');
    diagnosticResults.agentConnection = 'connected';
    
    // Track messages received by agent
    const agentMessages = [];
    agentWS.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        log.event(`Agent received: ${msg.type}`);
        log.data('Agent message', msg);
        agentMessages.push(msg);
        
        // Respond to 'open' commands
        if (msg.type === 'open') {
          diagnosticResults.agentReceivedCommand = msg;
          log.success(`Agent received 'open' command for row ${msg.rowId}: ${msg.url}`);
          
          // Simulate agent processing
          setTimeout(() => {
            // Send status update
            agentWS.send(JSON.stringify({
              type: 'status',
              agentId: agentId,
              rowId: msg.rowId,
              state: 'running',
              error: null,
            }));
            log.event(`Agent sent 'running' status for row ${msg.rowId}`);
            diagnosticResults.statusUpdates.push({ rowId: msg.rowId, state: 'running' });
          }, 500);
          
          setTimeout(() => {
            // Send bandwidth
            const bw = Math.floor(Math.random() * 5000000) + 1000000;
            agentWS.send(JSON.stringify({
              type: 'bandwidth',
              agentId: agentId,
              rowId: msg.rowId,
              bytesPerSec: bw,
            }));
            log.event(`Agent sent bandwidth update: ${bw} bytes/sec`);
            diagnosticResults.bandwidthUpdates.push({ rowId: msg.rowId, bytesPerSec: bw });
          }, 1000);
        }
      } catch (e) {
        log.warn(`Failed to parse agent message: ${e.message}`);
      }
    });
    
    // Register agent
    const helloMsg = {
      type: 'hello',
      agentId: agentId,
      publicIp: '127.0.0.1',
      secret: process.env.AGENT_SECRET || '',
    };
    agentWS.send(JSON.stringify(helloMsg));
    log.info(`Sent agent hello: ${agentId}`);
    
    await delay(500);
    
    // Verify agent registration
    const agentsResp = await httpRequest('GET', '/agents');
    log.data('Agents response', agentsResp.body);
    
    if (agentsResp.body && agentsResp.body[agentId]) {
      log.success(`Agent registered: ${agentId}`);
      diagnosticResults.agentRegistration = 'registered';
    } else {
      log.error('Agent not registered!');
      diagnosticResults.agentRegistration = 'failed';
      diagnosticResults.errors.push('Agent registration failed');
    }
    
    log.step('PHASE 3: Frontend Connection');
    
    // Connect mock frontend
    frontendWS = await connectWS(FRONTEND_WS_PORT, 'Frontend');
    diagnosticResults.frontendConnection = 'connected';
    
    const frontendMessages = [];
    frontendWS.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        frontendMessages.push(msg);
        if (msg.type === 'rows') {
          log.event(`Frontend received rows update (${msg.rows?.length || 0} rows)`);
        }
      } catch (e) {}
    });
    
    await delay(300);
    
    log.step('PHASE 4: Set Random Test URLs');
    
    // Get current rows
    const rowsResp = await httpRequest('GET', '/rows');
    log.info(`Current rows: ${rowsResp.body?.length || 0}`);
    
    // Set URLs for first 5 rows
    const urlsToSet = TEST_URLS.slice(0, 5).map((url, i) => ({
      id: i + 1,
      url: url,
    }));
    
    log.data('Setting URLs', urlsToSet);
    
    const updateResp = await httpRequest('POST', '/rows', { rows: urlsToSet });
    if (updateResp.status === 200) {
      log.success('URLs updated successfully');
      diagnosticResults.urlUpdate = 'success';
    } else {
      log.error(`URL update failed: ${updateResp.status}`);
      diagnosticResults.urlUpdate = 'failed';
      diagnosticResults.errors.push(`URL update failed: ${updateResp.status}`);
    }
    
    // Verify URLs were set
    const verifyResp = await httpRequest('GET', '/rows');
    const row1 = verifyResp.body?.find(r => r.id === 1);
    log.data('Row 1 after update', row1);
    
    log.step('PHASE 5: Trigger Run');
    
    // Trigger run for rows 1-3
    const runPayload = { rowIds: [1, 2, 3] };
    log.data('Run payload', runPayload);
    
    const runResp = await httpRequest('POST', '/run', runPayload);
    log.data('Run response', runResp);
    
    if (runResp.status === 200) {
      log.success('Run triggered successfully');
      diagnosticResults.runTrigger = 'success';
    } else {
      log.error(`Run failed: ${runResp.status}`);
      log.data('Run error', runResp.body);
      diagnosticResults.runTrigger = 'failed';
      diagnosticResults.errors.push(`Run failed: ${JSON.stringify(runResp.body)}`);
    }
    
    log.step('PHASE 6: Monitor Results');
    
    // Wait for agent to receive and process commands
    log.info('Waiting for agent to process commands...');
    await delay(3000);
    
    // Check final row states
    const finalResp = await httpRequest('GET', '/rows');
    log.info('Final row states:');
    for (let i = 0; i < 5; i++) {
      const row = finalResp.body?.find(r => r.id === i + 1);
      if (row) {
        log.info(`  Row ${row.id}: url="${row.url}" state="${row.state}" error="${row.error || 'none'}" vm="${row.vm || 'none'}" bw=${row.bw || 0}`);
      }
    }
    
    // Check what messages agent received
    log.info(`Agent received ${agentMessages.length} messages`);
    const openCommands = agentMessages.filter(m => m.type === 'open');
    log.info(`Agent received ${openCommands.length} 'open' commands`);
    
    if (openCommands.length === 0) {
      log.error('Agent did NOT receive any open commands!');
      diagnosticResults.errors.push('Agent did not receive open commands');
    } else {
      log.success(`Agent received ${openCommands.length} open commands`);
    }
    
    log.step('DIAGNOSTIC SUMMARY');
    
    console.log('\n' + colors.bold + 'Results:' + colors.reset);
    console.log(`  Backend: ${diagnosticResults.backendStart === 'already_running' || diagnosticResults.backendStart === 'started' ? colors.green + '✓' : colors.red + '✗'} ${diagnosticResults.backendStart}${colors.reset}`);
    console.log(`  Agent Connection: ${diagnosticResults.agentConnection === 'connected' ? colors.green + '✓' : colors.red + '✗'} ${diagnosticResults.agentConnection}${colors.reset}`);
    console.log(`  Agent Registration: ${diagnosticResults.agentRegistration === 'registered' ? colors.green + '✓' : colors.red + '✗'} ${diagnosticResults.agentRegistration}${colors.reset}`);
    console.log(`  Frontend Connection: ${diagnosticResults.frontendConnection === 'connected' ? colors.green + '✓' : colors.red + '✗'} ${diagnosticResults.frontendConnection}${colors.reset}`);
    console.log(`  URL Update: ${diagnosticResults.urlUpdate === 'success' ? colors.green + '✓' : colors.red + '✗'} ${diagnosticResults.urlUpdate}${colors.reset}`);
    console.log(`  Run Trigger: ${diagnosticResults.runTrigger === 'success' ? colors.green + '✓' : colors.red + '✗'} ${diagnosticResults.runTrigger}${colors.reset}`);
    console.log(`  Agent Received Command: ${diagnosticResults.agentReceivedCommand ? colors.green + '✓ YES' : colors.red + '✗ NO'}${colors.reset}`);
    console.log(`  Status Updates: ${diagnosticResults.statusUpdates.length}`);
    console.log(`  Bandwidth Updates: ${diagnosticResults.bandwidthUpdates.length}`);
    
    if (diagnosticResults.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bold}Errors Found:${colors.reset}`);
      diagnosticResults.errors.forEach(e => console.log(`  ${colors.red}• ${e}${colors.reset}`));
    }
    
    // Diagnosis
    console.log(`\n${colors.bold}Diagnosis:${colors.reset}`);
    
    if (diagnosticResults.agentRegistration !== 'registered') {
      console.log(`${colors.yellow}• Agent registration failed - check AGENT_SECRET env var matches on backend and agent${colors.reset}`);
      console.log(`${colors.yellow}• Check network connectivity between agent and backend${colors.reset}`);
    }
    
    if (!diagnosticResults.agentReceivedCommand) {
      console.log(`${colors.yellow}• Agent did not receive commands - possible issues:${colors.reset}`);
      console.log(`${colors.yellow}  1. WebSocket connection may have dropped${colors.reset}`);
      console.log(`${colors.yellow}  2. Agent may not be properly registered${colors.reset}`);
      console.log(`${colors.yellow}  3. Backend may have routing issues${colors.reset}`);
    }
    
    if (diagnosticResults.runTrigger === 'failed') {
      console.log(`${colors.yellow}• Run trigger failed - check backend logs for errors${colors.reset}`);
      console.log(`${colors.yellow}• Verify URLs are valid (must be full URLs with http/https)${colors.reset}`);
    }
    
    if (diagnosticResults.errors.length === 0 && diagnosticResults.agentReceivedCommand) {
      console.log(`${colors.green}• All checks passed! The system appears to be working correctly.${colors.reset}`);
      console.log(`${colors.green}• If issues persist in Docker/Terraform/Oracle VM, check:${colors.reset}`);
      console.log(`${colors.green}  1. Network connectivity and firewall rules${colors.reset}`);
      console.log(`${colors.green}  2. BACKEND_HOST/BACKEND_WS environment variables${colors.reset}`);
      console.log(`${colors.green}  3. Chrome/Chromium installation on agent VMs${colors.reset}`);
      console.log(`${colors.green}  4. X11/display availability for non-headless Chrome${colors.reset}`);
    }
    
  } catch (e) {
    log.error(`Diagnostic failed: ${e.message}`);
    console.error(e);
  } finally {
    // Cleanup
    log.step('CLEANUP');
    if (agentWS) {
      agentWS.close();
      log.info('Agent WebSocket closed');
    }
    if (frontendWS) {
      frontendWS.close();
      log.info('Frontend WebSocket closed');
    }
    if (backendProcess) {
      backendProcess.kill();
      log.info('Backend process stopped');
    }
  }
}

// Main entry point
console.log(`
${colors.bold}${colors.blue}╔════════════════════════════════════════════════════════════╗
║     IllyBoost Frontend Run Diagnostic Tool                 ║
║                                                            ║
║  This tool simulates a complete frontend URL run flow      ║
║  to diagnose issues with deployments.                      ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

log.info(`Backend target: http://${BACKEND_HOST}:${API_PORT}`);
log.info(`Agent WS target: ws://${BACKEND_HOST}:${AGENT_WS_PORT}`);
log.info(`Frontend WS target: ws://${BACKEND_HOST}:${FRONTEND_WS_PORT}`);

runDiagnostics().then(() => {
  console.log(`\n${colors.bold}Diagnostic complete.${colors.reset}`);
  process.exit(0);
}).catch(e => {
  log.error(`Fatal error: ${e.message}`);
  process.exit(1);
});
