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

## Production Deployment

For production deployment (e.g., on Oracle Cloud or AWS), bind to all network interfaces:

```bash
HOST=0.0.0.0 npm start
```

This ensures the backend is accessible from outside the VM. If you don't set `HOST=0.0.0.0`, the backend will only be accessible from within the VM itself (`127.0.0.1`).

Endpoints:
- `GET /health` - health check endpoint (returns status, agent count, row count)
- `GET /rows` - get list of 20 rows
- `POST /rows` - update urls: `{ rows: [{id, url}, ...] }`
- `POST /run` - trigger run for rows: `{ rowIds: [1,2] }`
- `GET /agents` - list connected agent IDs
- `GET /screenshot/:id` - get screenshot for a specific row

Behavior:
- Agents connect to the WS server on port `3002` and receive `open` commands (`{type:'open', rowId, url}`) to launch browsers.
- Agents periodically send `bandwidth` messages (`{type:'bandwidth', agentId, rowId, bytesPerSec}`) which the backend stores and broadcasts to frontends over `ws://localhost:3003`.

## Environment Variables

### Network Configuration
- `HOST` - host to bind to (default `0.0.0.0` for all interfaces)
  - **Production/Cloud:** Use `0.0.0.0` to allow external access (default)
  - **Local-only development:** Set `HOST=localhost` or `HOST=127.0.0.1` for security
  - **Note:** IllyBoost is designed for cloud deployment, so `0.0.0.0` is the default. For local development where you don't need external access, explicitly set `HOST=localhost`.
- `PORT` - REST API port (default `3001`)
- `WS_PORT` - agent WS port (default `3002`)
- `FRONT_WS_PORT` - frontend WS port (default `3003`)

### Security
- `AGENT_SECRET` - optional shared secret. When set, agents must include this value in their `hello` message (`secret`) or the backend will reject them.

### TLS / WSS Support
- `SSL_KEY_PATH` - path to the TLS private key file (PEM). When provided together with `SSL_CERT_PATH` the backend will start HTTPS and serve WSS endpoints on the same port.
- `SSL_CERT_PATH` - path to the TLS certificate file (PEM).

When TLS is enabled the backend exposes two WebSocket paths on the same HTTPS port:
- agents connect to: `wss://<host>:<PORT>/agents`
- frontend connects to: `wss://<host>:<PORT>/front`

If TLS vars are not provided the backend falls back to plain HTTP and separate WS ports (see `WS_PORT` and `FRONT_WS_PORT`).

## CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative dev port)
- `http://localhost:8080` (another common dev port)
- `https://illmedicine.github.io` (GitHub Pages production)

To add additional origins, edit `server.js` and update the `corsOptions.origin` array.

## Front-end Live Updates

- Agent WS: `3002` (agents connect here)
- Frontend WS: `3003` (frontend connects here for real-time rows/bandwidth updates)

## Troubleshooting

### Backend not accessible from outside VM

**Symptom:** `curl http://VM_IP:3001/health` fails with "Connection refused"

**Solution:** Ensure `HOST=0.0.0.0` is set:
```bash
HOST=0.0.0.0 npm start
```

Check if backend is listening on all interfaces:
```bash
sudo lsof -i -P -n | grep LISTEN | grep node
```

Should show `0.0.0.0:3001`, not `127.0.0.1:3001`.

### CORS errors in browser

**Symptom:** Browser console shows CORS policy errors

**Solution:** Verify your frontend origin is in the `corsOptions.origin` array in `server.js`.

For detailed troubleshooting, see [ORACLE_TROUBLESHOOTING.md](../ORACLE_TROUBLESHOOTING.md).
