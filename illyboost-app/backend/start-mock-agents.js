#!/usr/bin/env node
/**
 * Mock Agent Launcher
 * Starts multiple mock agents to simulate a cluster of VMs
 */

const { spawn } = require('child_process');
const path = require('path');

const NUM_AGENTS = process.argv[2] ? parseInt(process.argv[2]) : 5;
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`
${colors.bold}${colors.cyan}╔════════════════════════════════════════╗${colors.reset}
${colors.bold}${colors.cyan}║  IllyBoost Mock Agent Cluster Launcher ║${colors.reset}
${colors.bold}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}

${colors.bold}Configuration:${colors.reset}
  Backend: ${BACKEND_HOST}:3002
  Agents:  ${NUM_AGENTS} mock agents
  Each agent will:
    - Connect via WebSocket
    - Register with backend
    - Wait for run commands
    - Simulate bandwidth metrics
    - Send screenshots
    - Report status updates

${colors.bold}Starting agents...${colors.reset}
`);

const agents = [];

for (let i = 1; i <= NUM_AGENTS; i++) {
  const agentId = `agent-${String(i).padStart(2, '0')}`;
  
  const agent = spawn('node', [
    path.join(__dirname, 'mock-agent.js'),
    agentId,
    i.toString(),
  ], {
    env: {
      ...process.env,
      BACKEND_HOST: BACKEND_HOST,
    },
    stdio: 'inherit',
  });
  
  agents.push({ id: agentId, process: agent });
  
  console.log(`${colors.green}✓${colors.reset} Started ${agentId}`);
}

console.log(`
${colors.bold}${colors.green}All ${NUM_AGENTS} agents running!${colors.reset}

${colors.bold}Next steps:${colors.reset}
  1. Open http://localhost:5173/IllyBoost/
  2. Add URLs to rows (up to 20)
  3. Select rows and click "Run"
  4. Watch agents process in real-time
  5. View metrics and screenshots

${colors.yellow}Tip:${colors.reset} You can add up to ${NUM_AGENTS} URLs and they'll be distributed across agents

${colors.yellow}Press Ctrl+C to stop all agents${colors.reset}
`);

// Handle shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down ${NUM_AGENTS} agents...${colors.reset}`);
  agents.forEach(({ process: proc }) => {
    proc.kill();
  });
  setTimeout(() => process.exit(0), 1000);
});
