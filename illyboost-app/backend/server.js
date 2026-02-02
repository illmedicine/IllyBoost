const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const axios = require('axios');
// const AWS = require('aws-sdk'); // Optional for future AWS integration

const path = require('path');
const app = express();

// CORS configuration - allow GitHub Pages and local development
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Local Vite dev server
    'http://localhost:3000',           // Alternative dev port
    'http://localhost:8080',           // Another common dev port
    'https://illmedicine.github.io'    // GitHub Pages production
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Serve static frontend files if present (same-origin deployment)
const staticPath = process.env.STATIC_PATH || path.join(__dirname, 'public');
app.use(express.static(staticPath));

// Network configuration
// HOST defaults to '0.0.0.0' to allow external access (required for cloud deployments)
// For local-only development, set HOST=localhost or HOST=127.0.0.1
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;
const FRONT_WS_PORT = process.env.FRONT_WS_PORT || 3003;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '';

// In-memory store for URL rows and agent connections
let urlRows = Array.from({length:20}, (_,i)=>({id:i+1,url:'',state:'idle',error:null,vm:null,bw:0,screenshot:null,screenshotTime:null}));
// agents: agentId -> { ws, ip, publicIp }
let agents = {};
let frontClients = new Set();

// Helper to broadcast rows to frontends
function broadcastRows() {
  const agentInfos = {};
  for (const [id, obj] of Object.entries(agents)) {
    agentInfos[id] = obj && obj.ip ? obj.ip : null;
  }
  const payload = JSON.stringify({ type: 'rows', rows: urlRows, agents: agentInfos });
  for (const c of frontClients) {
    try { if (c.readyState === WebSocket.OPEN) c.send(payload); }
    catch (e) { console.error('failed send to front client', e); }
  }
}

// WebSocket server for agents to connect and send bandwidth updates
let wssAgents, wssFront;

function setupPlainWS() {
  wssAgents = new WebSocket.Server({ port: WS_PORT, host: HOST });
  wssAgents.on('connection', (ws, req) => {
    handleAgentConnection(ws, req);
  });

  wssFront = new WebSocket.Server({ port: FRONT_WS_PORT, host: HOST });
  wssFront.on('connection', (ws) => {
    console.log('Frontend connected to WS');
    frontClients.add(ws);
    try {
      const agentInfos = {};
      for (const [id, obj] of Object.entries(agents)) {
        agentInfos[id] = obj && obj.ip ? obj.ip : null;
      }
      ws.send(JSON.stringify({type:'rows', rows: urlRows, agents: agentInfos}));
    } catch(e){}
    ws.on('close', ()=>{ frontClients.delete(ws); console.log('Frontend disconnected'); });
  });
}

function handleAgentConnection(ws, req) {
  console.log('Agent connected');
  let agentId = null;
  const remoteIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : null;

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'hello') {
        agentId = msg.agentId;
        const secret = msg.secret;
        const required = process.env.AGENT_SECRET;
        if (required && required.length>0 && secret !== required) {
          console.log('Agent failed auth', agentId, remoteIp);
          try { ws.close(); } catch(e){}
          return;
        }
        const reportedIp = msg.publicIp || remoteIp;
        agents[agentId] = { ws: ws, ip: reportedIp, lastSeen: Date.now() };
        console.log('Registered agent', agentId, 'ip=', reportedIp);
        broadcastRows();
      }
      if (msg.type === 'bandwidth') {
        const { agentId, rowId, bytesPerSec } = msg;
        const row = urlRows.find(r=>r.id===rowId);
        if (row) {
          row.bw = bytesPerSec;
          row.state = 'running';
          row.error = null;
          row.vm = agentId;
        }
        if (agents[agentId]) agents[agentId].lastSeen = Date.now();
        broadcastRows();
      }
      if (msg.type === 'status') {
        const { agentId, rowId, state, error } = msg;
        const row = urlRows.find(r=>r.id===rowId);
        if (row) {
          if (state) row.state = state;
          row.error = error || null;
          if (agentId) row.vm = agentId;
        }
        if (agents[agentId]) agents[agentId].lastSeen = Date.now();
        broadcastRows();
      }
      if (msg.type === 'render') {
        const { rowId, html } = msg;
        const row = urlRows.find(r=>r.id===rowId);
        if (row) {
          row.render = html;
          row.renderTime = Date.now();
        }
        if (agentId && agents[agentId]) agents[agentId].lastSeen = Date.now();
        // notify frontends of updated rows
        broadcastRows();
      }
      if (msg.type === 'screenshot') {
        const { rowId, data } = msg;
        const row = urlRows.find(r=>r.id===rowId);
        if (row && data) {
          row.screenshot = data;  // base64 encoded PNG
          row.screenshotTime = Date.now();
        }
        if (agentId && agents[agentId]) agents[agentId].lastSeen = Date.now();
        broadcastRows();
      }
    } catch (e) { console.error('ws message parse err', e); }
  });

  ws.on('close', () => {
    if (agentId) { delete agents[agentId]; }
    console.log('Agent disconnected', agentId);
  });
}

// REST API
app.get('/health', (req,res)=>{
  res.json({status: 'online', agents: Object.keys(agents).length, rows: urlRows.length});
});

app.get('/rows', (req,res)=>{
  res.json(urlRows);
});

app.post('/rows', (req,res)=>{
  const {rows} = req.body; // array of {id,url}
  rows.forEach(r=>{
    const row = urlRows.find(x=>x.id===r.id);
    if (row) row.url = r.url;
  });
  res.json({ok:true});
});

// Trigger run: payload {rowIds: [], reuseAgentIds: []}
app.post('/run', async (req,res)=>{
  const { rowIds } = req.body;
  // For now, map each row to an available agent if present.
  const agentIds = Object.keys(agents);
  if (agentIds.length === 0) return res.status(500).json({error:'No agents connected. Provision VMs then start agent.'});

  if (!Array.isArray(rowIds) || rowIds.length === 0) {
    return res.status(400).json({error:'rowIds must be a non-empty array'});
  }

  console.log('POST /run: rowIds=', rowIds, 'available agents=', agentIds);

  // assign agents round-robin
  rowIds.forEach((rowId, idx)=>{
    const row = urlRows.find(r=>r.id===rowId);
    if (!row) return;

    if (!row.url || typeof row.url !== 'string' || row.url.trim().length === 0) {
      row.state = 'error';
      row.error = 'Missing URL';
      return;
    }
    try {
      // basic validation; will throw if invalid
      new URL(row.url);
    } catch (e) {
      row.state = 'error';
      row.error = 'Invalid URL';
      return;
    }

    const agentId = agentIds[idx % agentIds.length];
    const agent = agents[agentId];  // agents[id] = { ws, ip }
    console.log('  assigning row', rowId, 'url=', row.url, 'to agent', agentId, 'agent=', agent ? 'found' : 'not found');
    if (agent && agent.ws && agent.ws.readyState === WebSocket.OPEN) {
      console.log('  sending open message to agent', agentId);
      agent.ws.send(JSON.stringify({type:'open', rowId: rowId, url: row.url}));
      row.state = 'starting';
      row.error = null;
      row.vm = agentId;
    } else {
      console.log('  agent not ready: agent=', !!agent, 'ws=', agent ? !!agent.ws : 'N/A', 'readyState=', agent && agent.ws ? agent.ws.readyState : 'N/A');
      row.state = 'error';
      row.error = 'Agent not ready';
    }
  });

  broadcastRows();

  res.json({ok:true});
});

app.get('/agents', (req,res)=>{
  const map = {};
  for (const [id,obj] of Object.entries(agents)) map[id] = obj && obj.ip ? obj.ip : null;
  res.json(map);
});

// Return last rendered HTML for a row (if any)
app.get('/render/:id', (req,res)=>{
  const id = parseInt(req.params.id,10);
  const row = urlRows.find(r=>r.id===id);
  if (!row) return res.status(404).json({error:'not found'});
  if (!row.render) return res.status(204).send('');
  res.type('html').send(row.render);
});

// Return screenshot for a row (if any)
app.get('/screenshot/:id', (req,res)=>{
  const id = parseInt(req.params.id,10);
  const row = urlRows.find(r=>r.id===id);
  if (!row) return res.status(404).json({error:'not found'});
  if (!row.screenshot) return res.status(204).json({error:'no screenshot'});
  // Return as base64 data URI or raw PNG
  res.json({screenshot: row.screenshot, time: row.screenshotTime});
});

// Start servers: support optional TLS (HTTPS + WSS on paths) if certs provided
const fs = require('fs');
let server;
if (SSL_KEY_PATH && SSL_CERT_PATH && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
  const https = require('https');
  const key = fs.readFileSync(SSL_KEY_PATH);
  const cert = fs.readFileSync(SSL_CERT_PATH);
  server = https.createServer({ key, cert }, app);

  // Attach WSS on paths: agents at /agents, frontend at /front
  wssAgents = new WebSocket.Server({ server: server, path: '/agents' });
  wssAgents.on('connection', (ws, req) => handleAgentConnection(ws, req));

  wssFront = new WebSocket.Server({ server: server, path: '/front' });
  wssFront.on('connection', (ws) => {
    console.log('Frontend connected to WS (secure)');
    frontClients.add(ws);
    try {
      const agentInfos = {};
      for (const [id, obj] of Object.entries(agents)) {
        agentInfos[id] = obj && obj.ip ? obj.ip : null;
      }
      ws.send(JSON.stringify({type:'rows', rows: urlRows, agents: agentInfos}));
    } catch(e){}
    ws.on('close', ()=>{ frontClients.delete(ws); console.log('Frontend disconnected'); });
  });

  server.listen(PORT, HOST, ()=>console.log(`Backend HTTPS and WSS listening on ${HOST}:${PORT}`));
  console.log('Secure agent WSS path: /agents, frontend WSS path: /front');
} else {
  // start plain HTTP REST
  app.listen(PORT, HOST, ()=>console.log(`Backend API listening on ${HOST}:${PORT}`));
  console.log(`Agent WS server listening on ${HOST}:${WS_PORT}`);
  console.log(`Frontend WS server listening on ${HOST}:${FRONT_WS_PORT}`);
  setupPlainWS();
}
