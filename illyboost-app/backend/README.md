# Backend

Run locally:

1. Install dependencies:

```bash
cd backend
npm install
```

2. Start server:

```bash
npm start
```

Defaults:
- REST API: `http://localhost:3001`
- Agent WebSocket server: `ws://localhost:3002` (agents connect here)
- Frontend WebSocket server: `ws://localhost:3003` (frontend connects here for live updates)

Endpoints:
- `GET /rows` - get list of 20 rows
- `POST /rows` - update urls: `{ rows: [{id, url}, ...] }`
- `POST /run` - trigger run for rows: `{ rowIds: [1,2] }`
- `GET /agents` - list connected agent IDs

Behavior:
- Agents connect to the WS server on port `3002` and receive `open` commands (`{type:'open', rowId, url}`) to launch browsers.
- Agents periodically send `bandwidth` messages (`{type:'bandwidth', agentId, rowId, bytesPerSec}`) which the backend stores and broadcasts to frontends over `ws://localhost:3003`.

Env vars:
- `PORT` - REST API port (default `3001`)
- `WS_PORT` - agent WS port (default `3002`)
- `FRONT_WS_PORT` - frontend WS port (default `3003`)
 - `AGENT_SECRET` - optional shared secret. When set, agents must include this value in their `hello` message (`secret`) or the backend will reject them.
TLS / WSS support:
- `SSL_KEY_PATH` - path to the TLS private key file (PEM). When provided together with `SSL_CERT_PATH` the backend will start HTTPS and serve WSS endpoints on the same port.
- `SSL_CERT_PATH` - path to the TLS certificate file (PEM).

When TLS is enabled the backend exposes two WebSocket paths on the same HTTPS port:
- agents connect to: `wss://<host>:<PORT>/agents`
- frontend connects to: `wss://<host>:<PORT>/front`

If TLS vars are not provided the backend falls back to plain HTTP and separate WS ports (see `WS_PORT` and `FRONT_WS_PORT`).

Front-end live updates:
- Agent WS: `3002` (agents connect here)
- Frontend WS: `3003` (frontend connects here for real-time rows/bandwidth updates)
