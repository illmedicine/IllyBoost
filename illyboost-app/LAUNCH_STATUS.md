# IllyBoost is Now Running!

## Frontend URL
🌐 http://localhost:5173/IllyBoost/

## Backend Services
- **REST API:** http://localhost:3001
- **Agent WebSocket:** ws://localhost:3002
- **Frontend WebSocket:** ws://localhost:3003

## What You Can Test

### 1. Add URLs to Frontend
- Open http://localhost:5173/IllyBoost/ in your browser
- Enter up to 20 URLs in the rows (one URL per row)
- Click "Run" to trigger execution on agents

### 2. View Real-Time Metrics
- Bandwidth usage updates in real-time
- Status indicators show: idle, starting, running, done, error
- Screenshot previews available (📸 button)

### 3. Agent Connection
- When you have agents connected, they'll appear in the status area
- Each row gets assigned to an available agent via round-robin
- Check agent IP addresses displayed in the UI

## For Production with 20 VMs

To test with 20 separate VMs:

### 1. Deploy Agents on EC2
```bash
# On each EC2 instance, set environment:
export BACKEND_HOST=your-backend-ip
export BACKEND_WS=ws://your-backend-ip:3002
export AGENT_ID=agent-1  # Unique per VM
export AGENT_SECRET=your-secret

# Start Python agent
python agent.py
```

### 2. Set Backend for Production
```bash
# With TLS (recommended)
SSL_KEY_PATH=/etc/certs/server.key \
SSL_CERT_PATH=/etc/certs/server.crt \
AGENT_SECRET=your-secret \
node server.js
```

### 3. Frontend Configuration
- Ensure frontend connects to backend host (not localhost)
- Update websocket URLs in App.jsx:
```javascript
const WS_URL = 'ws://your-backend-ip:3003';
const API_URL = 'http://your-backend-ip:3001';
```

## Test Flow

1. **Add URLs:** Paste up to 20 URLs in the frontend
2. **Check Agents:** Verify agents are connected in the Agent Status area
3. **Click Run:** Select rows and click "Run" to trigger
4. **Monitor:** Watch real-time bandwidth and status updates
5. **View Results:** Click screenshot icon to see rendered pages

## Current Status

✅ Backend running on ports 3001, 3002, 3003
✅ Frontend running on http://localhost:5173/IllyBoost/
✅ Both connected and ready for testing
✅ No agents connected yet (will appear when agents join)

## Stopping Services

**Backend:**
```powershell
# In backend terminal: Ctrl+C
```

**Frontend:**
```powershell
# In frontend terminal: Ctrl+C
```

## Next Steps

1. Test with the frontend at http://localhost:5173/IllyBoost/
2. Deploy Python agents on test VMs
3. Configure agents to connect to your backend
4. Test batch URL processing across agents
5. Monitor performance and bandwidth metrics
6. Scale to 20 VMs when ready for production

---

**All systems operational - Ready for testing!**
