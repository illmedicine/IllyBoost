#!/usr/bin/env node
/**
 * Oracle Cloud Setup Helper
 * Guides you through setting up Oracle Cloud infrastructure
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(type, msg) {
  const icons = {
    info: '•',
    success: '✓',
    warning: '⚠',
    error: '✗',
    step: '→',
  };
  
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    step: colors.blue,
  };
  
  console.log(`${colorMap[type]}${icons[type]}${colors.reset} ${msg}`);
}

console.log(`
${colors.bold}${colors.blue}╔════════════════════════════════════════╗${colors.reset}
${colors.bold}${colors.blue}║   Oracle Cloud Infrastructure Setup    ║${colors.reset}
${colors.bold}${colors.blue}╚════════════════════════════════════════╝${colors.reset}
`);

log('info', 'This guide will help you set up IllyBoost on Oracle Cloud');
log('info', '');

// Check for required tools
log('step', 'Checking required tools...');

const requiredTools = [
  { name: 'Terraform', cmd: 'terraform --version' },
  { name: 'Oracle Cloud CLI', cmd: 'oci --version' },
];

let missingTools = [];

console.log(`
${colors.bold}Prerequisites:${colors.reset}

1. Oracle Cloud Free Account (Always Free tier)
2. Terraform installed (https://www.terraform.io/downloads)
3. Oracle Cloud CLI installed (https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm)

${colors.bold}Next Steps:${colors.reset}

${colors.green}✓${colors.reset} Have Oracle Cloud account? YES ➜ Continue below
${colors.green}✓${colors.reset} Need to create account? Go to https://www.oracle.com/cloud/free/

${colors.bold}Once you have an Oracle account:${colors.reset}

1. Get your Tenancy ID and User ID:
   - Oracle Cloud Console (top-right) → My Profile
   - Copy Tenancy ID
   - Copy User ID

2. Create API Signing Key:
   - My Profile → API Keys → Add API Key
   - Choose "Generate API Key Pair"
   - Download private key (save as ~/.oci/oci_api_key.pem)
   - Copy fingerprint

3. Get Compartment ID:
   - Identity & Security → Compartments
   - Copy the OCID of your compartment

4. Run this script again with:
   export OCI_TENANCY_ID="your-tenancy-id"
   export OCI_USER_ID="your-user-id"
   export OCI_REGION="us-ashburn-1"  # or your region
   node oracle-setup.js

${colors.yellow}Or continue to use Terraform directly (easier):${colors.reset}

   cd infra
   terraform init -backend=false
   terraform apply -var-file=oracle.tfvars
`);
