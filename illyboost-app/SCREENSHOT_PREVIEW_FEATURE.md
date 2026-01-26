# Screenshot Preview Feature

**Added:** January 25, 2026

## Overview

The Screenshot Preview feature enables real-time visual verification of URLs running on remote VM agents. Users can click a "📸 Preview" button to view a live thumbnail screenshot of the active Chrome browser session on each VM.

## Why This Matters

When running URLs on distributed agents, users need assurance that:
- ✅ The correct URL is actually running on the VM
- ✅ The page is loading properly
- ✅ The browser session is active and responsive
- ✅ No redirect or error has occurred

The screenshot preview provides this visual confirmation at a glance.

---

## How It Works

### 1. **Agent Screenshot Capture** (`agent/agent.py`)

The Python agent now captures periodic screenshots using the `gnome-screenshot` utility:

```python
def capture_screenshot():
    """Capture screenshot of current Chrome window using gnome-screenshot"""
    try:
        result = subprocess.run(['gnome-screenshot', '-f', '/tmp/illy-screenshot.png'], 
                              capture_output=True, timeout=5)
        if result.returncode == 0 and os.path.exists('/tmp/illy-screenshot.png'):
            with open('/tmp/illy-screenshot.png', 'rb') as f:
                img_data = f.read()
                return base64.b64encode(img_data).decode('ascii')
    except Exception:
        pass
    return None
```

**Frequency:** Every 3 seconds (configurable via `sleep()` in `screenshot_loop()`)

**Encoding:** PNG images are base64-encoded for transmission over WebSocket

**Error Handling:** Silently fails if screenshot tools are unavailable (graceful degradation)

### 2. **Backend Screenshot Storage** (`backend/server.js`)

The backend receives and stores screenshots from agents:

```javascript
if (msg.type === 'screenshot') {
  const { rowId, data } = msg;
  const row = urlRows.find(r=>r.id===rowId);
  if (row && data) {
    row.screenshot = data;  // base64 encoded PNG
    row.screenshotTime = Date.now();
  }
  broadcastRows();
}
```

**Storage:** In-memory (latest screenshot per row)  
**Broadcast:** Shared with all connected frontend clients via WebSocket

**New API Endpoint:**
```
GET /screenshot/:id
Response: {screenshot: "<base64 PNG>", time: <timestamp>}
```

### 3. **Frontend Display** (`frontend/src/App.jsx` & `frontend/demo.html`)

Users can click the Preview button to view the screenshot in a modal:

**Features:**
- 📸 Preview button on each row (only enabled when agent is running)
- Modal overlay with full-size screenshot
- Click outside modal to close
- Base64 data URI for direct image rendering (no additional network requests)
- Loading state while fetching
- Error handling for unavailable screenshots

**CSS Styling:**
```css
.preview-btn         /* Screenshot button styling */
.preview-modal       /* Full-screen modal background */
.preview-modal-content  /* Screenshot viewer container */
.preview-screenshot  /* Actual screenshot image */
```

---

## Implementation Details

### File Changes

| File | Changes |
|------|---------|
| `agent/agent.py` | Added `capture_screenshot()`, `screenshot_loop()`, screenshot threading |
| `backend/server.js` | Added screenshot message handler, `/screenshot/:id` endpoint, screenshot storage |
| `frontend/src/App.jsx` | Added preview modal, screenshot fetch logic, preview button |
| `frontend/src/styles.css` | Added modal and button styles |
| `frontend/demo.html` | Added preview modal demo with placeholder |

### Dependencies

**New Python packages:** None (uses `gnome-screenshot` system utility)  
**New Node.js packages:** None  
**New Frontend packages:** None (React built-in)

### Configuration

The screenshot feature is **automatic** - no configuration needed. However, you can customize:

**In `agent/agent.py`:**
```python
time.sleep(3)  # Change capture frequency (in seconds)
```

**Prerequisites on Agent VMs:**
- `gnome-screenshot` utility installed (included in standard Ubuntu desktop)
- X11/Wayland display server running
- Chrome browser running in display environment

---

## Usage

### For Frontend Users

1. **Enter URL and Run:**
   ```
   - Type URL in row → Click "Run Selected"
   - Agent launches Chrome and starts capturing screenshots
   ```

2. **View Screenshot:**
   ```
   - Click 📸 button on active row
   - Modal opens with live screenshot
   - Close with × button or click outside
   ```

3. **Monitor Multiple Rows:**
   ```
   - Each row has independent screenshot
   - All screenshots update every 3 seconds
   - View any row at any time
   ```

### For Developers

**Testing locally:**
```bash
# Start backend
cd backend && npm install && npm start

# Start frontend
cd frontend && npm install && npm run dev

# Or test with Docker agents (Linux only)
docker compose -f docker-compose.test.yml up --scale agent=3 --build
```

**Demo without backend:**
```bash
# Open in browser
open frontend/demo.html
# Or start local server
npx http-server frontend
```

---

## Error Handling

The feature gracefully handles various failure modes:

| Scenario | Behavior |
|----------|----------|
| Agent has no screenshot yet | "No screenshot available yet" message |
| gnome-screenshot not available | Agent skips silently, no error |
| Network fetch fails | "Failed to load: [error]" message |
| Modal dismissal | Click × or click outside |
| Screenshot too old | Still displays last known screenshot |

---

## Performance Considerations

**Network Impact:**
- PNG screenshots: ~50-200KB per image (depending on page complexity)
- Frequency: Every 3 seconds = ~20-66KB/sec per active row
- Total bandwidth: Manageable for reasonable agent counts

**Storage Impact:**
- Backend: One screenshot per row (20 rows max) = ~2-4MB RAM
- Agent: Temporary screenshot file (~100KB) cleared after transmission

**Display Performance:**
- Base64 data URIs rendered client-side (no additional HTTP requests)
- Modal rendering is lightweight and responsive

---

## Future Enhancements

Potential improvements to the screenshot feature:

1. **Screenshot History**
   - Store last N screenshots per row
   - Timeline view of page loading progression
   - Download screenshot as PNG/JPG

2. **Adaptive Quality**
   - Reduce compression for detailed inspection
   - Thumbnail vs full resolution toggle
   - Configurable capture resolution

3. **Comparison View**
   - Side-by-side comparison of multiple rows
   - Screenshot diff highlighting
   - Expected vs actual URL validation

4. **Advanced Metrics**
   - Screenshot timestamp and freshness indicator
   - Page load visual timeline
   - Click-to-inspect element location

5. **Integration**
   - Screenshot annotations/markup
   - Export as PDF report with screenshots
   - WebDAV/S3 storage backend for history

---

## Security Notes

- Screenshots are base64-encoded and transmitted over WebSocket
- Consider using **WSS (TLS)** in production for encrypted transmission
- Screenshots contain sensitive page content - restrict access accordingly
- Implement authentication/authorization if exposing to untrusted networks

**Recommendation:** Run backend with TLS in production:
```bash
SSL_KEY_PATH=/path/to/key.pem SSL_CERT_PATH=/path/to/cert.pem npm start
```

---

## Technical Architecture

```
┌─────────────────────────────────────────────┐
│ Frontend (React/Vite)                       │
│ - Preview Button & Modal UI                 │
│ - Fetch /screenshot/:id endpoint            │
│ - Display base64 PNG images                 │
└────────────────────┬────────────────────────┘
                     │ HTTP GET /screenshot/:id
                     │
┌────────────────────▼────────────────────────┐
│ Backend (Node.js/Express)                   │
│ - Store latest screenshot per row           │
│ - Broadcast updates via WS                  │
│ - API: GET /screenshot/:id → base64 PNG     │
└────────────────────┬────────────────────────┘
                     │ WS message: {type: 'screenshot', rowId, data}
                     │
┌────────────────────▼────────────────────────┐
│ Agent (Python)                              │
│ - screenshot_loop() runs every 3s           │
│ - capture_screenshot() → gnome-screenshot   │
│ - Base64 encode PNG → send to backend       │
│ - Chrome browser running on VM              │
└─────────────────────────────────────────────┘
```

---

## Troubleshooting

### "No screenshot available yet"
- **Cause:** Agent hasn't captured first screenshot
- **Fix:** Wait 3+ seconds after starting run
- **Check:** `docker logs <agent-container>` for screenshot errors

### Screenshot button disabled
- **Cause:** No agent running for this row (vm = '-')
- **Fix:** Click "Run Selected" to start an agent

### Black/blank screenshots
- **Cause:** Chrome not displaying (headless mode, no display)
- **Fix:** Ensure `DISPLAY` environment variable is set on agent
- **Check:** `echo $DISPLAY` on agent VM (should be `:0`, `:1`, etc.)

### gnome-screenshot: command not found
- **Cause:** Screenshot utility not installed
- **Fix:** `apt-get install gnome-screenshot` on Ubuntu
- **Graceful:** Agent continues without screenshots (feature disabled)

### Large file sizes / slow performance
- **Cause:** High-resolution screenshots or complex pages
- **Fix:** Reduce capture frequency or resolution
- **Alternative:** Consider using headless screenshot service (Playwright, Puppeteer)

---

## End of Feature Documentation

This feature enables real-time visual verification of distributed browser sessions, giving users confidence that URLs are running correctly on remote agents.
