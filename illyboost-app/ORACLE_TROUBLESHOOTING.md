# Oracle Cloud Connectivity Troubleshooting Guide

## ⚠️ "Could not connect to backend" - Complete Diagnostic Guide

When IllyBoost shows **"Could not connect to backend"**, it almost always means one of these four things:

---

## Most Likely Cause: Backend Not Reachable from Public Internet

Your frontend is hosted on GitHub Pages, which is public.  
Your Oracle VMs are almost certainly **not publicly reachable** unless you explicitly:

- ✅ Opened the correct ports in the OCI Security List
- ✅ Opened the same ports in the VM's OS firewall
- ✅ Bound your backend server to `0.0.0.0`, not `localhost`
- ✅ Ensured the backend is listening on the correct port

**Even if the VM is "online," the backend may still be invisible to the frontend.**

---

## ✅ Fix Checklist (99% of IllyBoost Connection Failures)

### 1. Confirm the Backend is Actually Running

SSH into the VM and run:

```bash
ps aux | grep node
```

or  

```bash
sudo lsof -i -P -n | grep LISTEN
```

You should see your backend listening on something like:

```
node    12345 user   10u  IPv4 123456      0t0  TCP 0.0.0.0:3001 (LISTEN)
node    12345 user   11u  IPv4 123457      0t0  TCP 0.0.0.0:3002 (LISTEN)
node    12345 user   12u  IPv4 123458      0t0  TCP 0.0.0.0:3003 (LISTEN)
```

**If it says `127.0.0.1:3001` → Frontend will NEVER reach it.**

#### Fix: Restart backend with proper host binding

```bash
# Option 1: Use environment variable
HOST=0.0.0.0 node server.js

# Option 2: Set in your startup script
export HOST=0.0.0.0
node server.js
```

---

### 2. Open the Backend Port in OCI Security List

Go to:

**OCI Console → Networking → Virtual Cloud Networks → Your VCN → Security Lists → Default Security List**

Add these **Ingress Rules**:

| Source CIDR | Protocol | Source Port Range | Destination Port Range | Description |
|-------------|----------|-------------------|----------------------|-------------|
| 0.0.0.0/0 | TCP | All | 3001 | Backend REST API |
| 0.0.0.0/0 | TCP | All | 3002 | Agent WebSocket |
| 0.0.0.0/0 | TCP | All | 3003 | Frontend WebSocket |

**If these rules are missing → frontend cannot connect.**

#### Quick Test After Adding Rules

From your laptop:

```bash
curl http://YOUR_VM_PUBLIC_IP:3001/health
```

Should return:
```json
{"status":"online","agents":0,"rows":20}
```

---

### 3. Open the Port in the VM's OS Firewall

#### For Ubuntu (most common):

```bash
# Allow backend ports
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 3003/tcp

# Check status
sudo ufw status

# If firewall is inactive, enable it
sudo ufw enable
```

Output should show:

```
To                         Action      From
--                         ------      ----
3001/tcp                   ALLOW       Anywhere
3002/tcp                   ALLOW       Anywhere
3003/tcp                   ALLOW       Anywhere
```

#### For Oracle Linux:

```bash
# Add ports permanently
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --add-port=3002/tcp --permanent
sudo firewall-cmd --add-port=3003/tcp --permanent

# Reload firewall
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-ports
```

**If this is not done → frontend cannot connect.**

---

### 4. Test Backend Connectivity from Outside

From your laptop or any external machine:

```bash
# Test REST API endpoint
curl http://YOUR_VM_PUBLIC_IP:3001/health

# Test if port is open
nc -zv YOUR_VM_PUBLIC_IP 3001
```

**Expected Results:**

✅ **Success:**
```bash
$ curl http://155.248.xxx.xxx:3001/health
{"status":"online","agents":0,"rows":20}

$ nc -zv 155.248.xxx.xxx 3001
Connection to 155.248.xxx.xxx 3001 port [tcp/*] succeeded!
```

❌ **Failure:**
```bash
$ curl http://155.248.xxx.xxx:3001/health
curl: (7) Failed to connect to 155.248.xxx.xxx port 3001: Connection refused

$ nc -zv 155.248.xxx.xxx 3001
nc: connect to 155.248.xxx.xxx port 3001 (tcp) failed: Connection refused
```

**If this fails → the frontend will also fail.**  
**If this works → the frontend should connect.**

---

### 5. Configure CORS for GitHub Pages

Your backend **must** allow requests from GitHub Pages origin:

```
https://illmedicine.github.io
```

#### Update Backend CORS Configuration

Edit `/home/runner/work/IllyBoost/IllyBoost/illyboost-app/backend/server.js`:

```javascript
// Replace this:
app.use(cors());

// With this:
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Local development
    'http://localhost:3000',           // Alternative dev port
    'https://illmedicine.github.io'    // GitHub Pages
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));
```

**If CORS blocks the request → frontend shows "Could not connect".**

---

## 🔥 The Most Common Mistake with Oracle VM Setups

**Your backend is running, but only inside the VM's private network.**

### Symptoms:

- ✅ VM shows "running" in Oracle Console
- ✅ You can `curl` the backend from **inside** the VM
- ❌ You **cannot** `curl` it from your laptop
- ❌ The frontend **cannot** reach it

**This is exactly what the error "Could not connect to backend" indicates.**

### Root Causes:

1. **Backend bound to `127.0.0.1`** (localhost only)
   - Fix: Set `HOST=0.0.0.0` before starting backend

2. **OCI Security List doesn't allow inbound traffic**
   - Fix: Add ingress rules for ports 3001-3003 from `0.0.0.0/0`

3. **VM OS firewall blocks the ports**
   - Fix: Use `ufw allow` or `firewall-cmd --add-port`

---

## 🎯 Complete Diagnostic Workflow

### Step 1: SSH into Your Backend VM

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_VM_PUBLIC_IP
```

### Step 2: Check if Backend is Running

```bash
ps aux | grep node
```

Expected:
```
ubuntu   12345  0.1  2.1  NODE_PID ... node server.js
```

If not running:
```bash
cd /home/ubuntu/IllyBoost/illyboost-app/backend
HOST=0.0.0.0 node server.js
```

### Step 3: Verify Backend is Listening on 0.0.0.0

```bash
sudo lsof -i -P -n | grep LISTEN | grep node
```

**✅ GOOD (binds to all interfaces):**
```
node    12345 ubuntu   10u  IPv4 123456      0t0  TCP 0.0.0.0:3001 (LISTEN)
node    12345 ubuntu   11u  IPv4 123457      0t0  TCP 0.0.0.0:3002 (LISTEN)
node    12345 ubuntu   12u  IPv4 123458      0t0  TCP 0.0.0.0:3003 (LISTEN)
```

**❌ BAD (only localhost):**
```
node    12345 ubuntu   10u  IPv4 123456      0t0  TCP 127.0.0.1:3001 (LISTEN)
```

If you see `127.0.0.1`, kill the process and restart with `HOST=0.0.0.0`:

```bash
# Kill the process
pkill -f "node server.js"

# Restart with proper binding
cd /home/ubuntu/IllyBoost/illyboost-app/backend
HOST=0.0.0.0 node server.js
```

### Step 4: Test from Inside the VM

```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"online","agents":0,"rows":20}
```

### Step 5: Test from Outside the VM

**Exit SSH** and from your laptop:

```bash
curl http://YOUR_VM_PUBLIC_IP:3001/health
```

**If this works → Continue to Step 6**  
**If this fails → Check Security Lists and OS Firewall**

### Step 6: Check OCI Security List

In Oracle Cloud Console:

1. Go to **Networking → Virtual Cloud Networks**
2. Click your VCN
3. Click **Security Lists**
4. Click **Default Security List**
5. Check **Ingress Rules**

Look for:
```
Source: 0.0.0.0/0
Protocol: TCP
Destination Port: 3001
```

If missing, click **Add Ingress Rule**:
- Source Type: CIDR
- Source CIDR: `0.0.0.0/0`
- IP Protocol: TCP
- Destination Port Range: `3001`
- Description: `Backend REST API`

Repeat for ports 3002 and 3003.

### Step 7: Check VM OS Firewall

SSH back into the VM:

```bash
# Check Ubuntu firewall
sudo ufw status

# If ports 3001-3003 are not listed, add them:
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 3003/tcp
```

### Step 8: Test Again from Outside

```bash
curl http://YOUR_VM_PUBLIC_IP:3001/health
```

Should now work! ✅

### Step 9: Update Frontend Configuration

If using GitHub Pages, ensure your frontend knows the backend URL.

For local testing, edit `frontend/src/App.jsx`:

```javascript
const API = 'http://YOUR_VM_PUBLIC_IP:3001'
```

For GitHub Pages deployment, set the `VITE_API` environment variable during build:

```bash
cd frontend
VITE_API=http://YOUR_VM_PUBLIC_IP:3001 npm run build
```

### Step 10: Test End-to-End

1. Open your frontend (http://localhost:5173 or GitHub Pages URL)
2. You should see "Backend Connected" or similar status
3. Try adding a URL and clicking "Run"
4. Check if agents appear and metrics update

---

## 📊 Quick Diagnostic Table

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `curl localhost:3001/health` works inside VM, but `curl VM_IP:3001/health` fails from laptop | Backend bound to 127.0.0.1 | Restart with `HOST=0.0.0.0` |
| `Connection refused` from outside | OCI Security List blocks port | Add ingress rule for port 3001 |
| `No route to host` | OS firewall blocks port | `sudo ufw allow 3001/tcp` |
| CORS error in browser console | CORS not configured for GitHub Pages | Add `https://illmedicine.github.io` to CORS origins |
| Backend shows connected but no data | WebSocket ports (3002, 3003) blocked | Add ingress rules for 3002, 3003 |

---

## 🔍 Detailed Logging for Troubleshooting

### Enable Detailed Backend Logging

Edit `backend/server.js` and add logging:

```javascript
// Add at the top
const DEBUG = process.env.DEBUG === 'true';

// Add to each endpoint
app.get('/health', (req, res) => {
  if (DEBUG) console.log('[DEBUG] /health called from', req.ip);
  res.json({status: 'online', agents: Object.keys(agents).length, rows: urlRows.length});
});
```

Start with debug mode:

```bash
DEBUG=true HOST=0.0.0.0 node server.js
```

### Monitor Backend Logs

```bash
# Follow logs in real-time
tail -f backend.log

# Or if using systemd
journalctl -u illyboost-backend -f
```

### Check Network Connectivity

```bash
# From inside VM - test outbound
ping 8.8.8.8

# From laptop - test inbound to VM
ping YOUR_VM_PUBLIC_IP

# Test specific port
nc -zv YOUR_VM_PUBLIC_IP 3001
```

---

## 🚀 Permanent Solution: Systemd Service

To keep backend running and auto-start on reboot:

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/illyboost-backend.service
```

Add:

```ini
[Unit]
Description=IllyBoost Backend Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/IllyBoost/illyboost-app/backend
Environment="HOST=0.0.0.0"
Environment="PORT=3001"
Environment="WS_PORT=3002"
Environment="FRONT_WS_PORT=3003"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable illyboost-backend
sudo systemctl start illyboost-backend
sudo systemctl status illyboost-backend
```

Check logs:

```bash
journalctl -u illyboost-backend -f
```

---

## 💡 Pro Tips

### 1. Always Test Layer by Layer

```bash
# Layer 1: Process running?
ps aux | grep node

# Layer 2: Listening on correct interface?
sudo lsof -i -P -n | grep LISTEN

# Layer 3: Accessible from localhost?
curl http://localhost:3001/health

# Layer 4: Accessible from public IP?
curl http://VM_PUBLIC_IP:3001/health

# Layer 5: CORS working?
# Check browser console for CORS errors
```

### 2. Use `netstat` to Debug

```bash
# Show all listening TCP ports
sudo netstat -tlnp | grep LISTEN

# Show connections to port 3001
sudo netstat -an | grep 3001
```

### 3. Verify Public IP

Your VM may have multiple IPs. Verify the public one:

```bash
# From inside VM
curl ifconfig.me
```

Use this IP in your frontend configuration.

### 4. Temporary Security Rule for Testing

If desperate, temporarily allow ALL traffic to test:

```bash
# WARNING: ONLY FOR TESTING
sudo ufw disable

# Test if it works now
curl http://VM_PUBLIC_IP:3001/health

# Re-enable with proper rules
sudo ufw enable
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 3003/tcp
```

---

## 📝 Checklist for New Oracle Deployments

Before deploying:

- [ ] VM is created and running
- [ ] VM has a public IP address
- [ ] SSH access is working
- [ ] Node.js is installed on VM
- [ ] Backend code is deployed to VM
- [ ] Backend starts without errors
- [ ] Backend binds to `0.0.0.0` (not `127.0.0.1`)
- [ ] Backend is listening on ports 3001, 3002, 3003
- [ ] OCI Security List has ingress rules for 3001-3003
- [ ] VM OS firewall allows ports 3001-3003
- [ ] Can `curl` backend from outside VM
- [ ] CORS is configured for GitHub Pages origin
- [ ] Frontend is configured with correct backend IP
- [ ] End-to-end test works (add URL → Run → see results)

---

## 🆘 Still Not Working?

### Reply with These 3 Things:

1. **Your backend port number**  
   Example: `3001`

2. **Output of this command from inside the VM:**  
   ```bash
   sudo lsof -i -P -n | grep LISTEN
   ```

3. **Your OCI Security List ingress rules**  
   Go to: Console → VCN → Security Lists → View Rules
   
   Screenshot or paste the rules for ports 3001-3003.

With those three pieces of information, we can diagnose the exact issue.

---

## 🎓 Understanding the Network Layers

```
┌─────────────────────────────────────────┐
│  Frontend (Browser / GitHub Pages)     │
│  https://illmedicine.github.io         │
└───────────────┬─────────────────────────┘
                │
                │ HTTP/WebSocket (public internet)
                │
┌───────────────▼─────────────────────────┐
│  OCI Security List (Firewall)          │
│  Must Allow: 0.0.0.0/0 → 3001-3003     │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  VM OS Firewall (ufw / firewalld)      │
│  Must Allow: ports 3001-3003           │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  Backend Process (Node.js)             │
│  Must Bind to: 0.0.0.0:3001           │
│  NOT: 127.0.0.1:3001                   │
└─────────────────────────────────────────┘
```

**Each layer must pass traffic for the connection to work!**

---

**You're very close — this is almost always a network exposure issue, not a VM issue.** 🚀
