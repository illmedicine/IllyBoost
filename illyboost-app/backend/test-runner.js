#!/usr/bin/env node
/**
 * IllyBoost E2E Test Runner
 * Comprehensive end-to-end test orchestration
 * Usage: npm run test:e2e (from backend directory)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${colors.bold}${colors.blue}=== IllyBoost E2E Test Suite ===${colors.reset}\n`);

let backendProcess = null;
let testProcess = null;

function log(level, msg) {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[✓]${colors.reset}`,
    error: `${colors.red}[✗]${colors.reset}`,
    warn: `${colors.yellow}[!]${colors.reset}`,
  }[level] || '[*]';
  console.log(`${prefix} ${msg}`);
}

function startBackend() {
  return new Promise((resolve, reject) => {
    log('info', 'Starting backend server...');
    
    backendProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    let startedOutput = '';
    const onData = (data) => {
      startedOutput += data.toString();
      process.stdout.write(data);
      
      // Look for startup confirmation
      if (startedOutput.includes('listening') || startedOutput.includes('Backend API')) {
        backendProcess.stdout.off('data', onData);
        backendProcess.stderr.off('data', onData);
        log('success', 'Backend started successfully');
        resolve();
      }
    };

    const onError = (data) => {
      startedOutput += data.toString();
      process.stdout.write(data);
    };

    backendProcess.stdout.on('data', onData);
    backendProcess.stderr.on('data', onError);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (startedOutput.length === 0) {
        reject(new Error('Backend failed to start (timeout)'));
      }
    }, 10000);

    backendProcess.on('error', (err) => {
      reject(new Error(`Failed to start backend: ${err.message}`));
    });
  });
}

function runTests() {
  return new Promise((resolve, reject) => {
    log('info', 'Running E2E tests...\n');
    
    const testFile = path.join(__dirname, 'e2e-test.js');
    
    testProcess = spawn('node', [testFile], {
      cwd: __dirname,  // Run from backend directory
      stdio: 'inherit',
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        log('success', 'All tests passed!');
        resolve(true);
      } else {
        log('error', 'Some tests failed');
        resolve(false);
      }
    });

    testProcess.on('error', (err) => {
      reject(new Error(`Test process error: ${err.message}`));
    });
  });
}

function cleanup() {
  return new Promise((resolve) => {
    log('info', 'Cleaning up processes...');
    
    if (testProcess) {
      try {
        testProcess.kill();
      } catch (e) {}
    }
    
    if (backendProcess) {
      try {
        backendProcess.kill('SIGTERM');
      } catch (e) {}
    }
    
    setTimeout(() => {
      if (backendProcess) {
        try {
          backendProcess.kill('SIGKILL');
        } catch (e) {}
      }
      resolve();
    }, 2000);
  });
}

async function main() {
  try {
    // Check if backend dependencies are installed
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      log('warn', 'Dependencies not installed. Installing...');
      // Note: In real scenario would need to run npm install
    }

    // Start backend
    await startBackend();
    
    // Wait for backend to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run tests
    const testsPassed = await runTests();
    
    // Cleanup
    await cleanup();
    
    process.exit(testsPassed ? 0 : 1);
  } catch (error) {
    log('error', error.message);
    await cleanup();
    process.exit(1);
  }
}

// Handle interrupts
process.on('SIGINT', async () => {
  console.log('\n');
  log('warn', 'Test interrupted by user');
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(1);
});

main();
