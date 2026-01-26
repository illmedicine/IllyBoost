"""
VM Agent
- Connects to backend WS (port 3002) and registers agentId
- Listens for `open` commands: {type:'open', rowId, url}
- Launches headless Chrome to visit the URL (uses --headless=new or puppeteer could be used).
- Periodically measures bytes transferred by the browser process and sends `bandwidth` messages: {agentId,rowId,bytesPerSec}

Note: This is a simple example. In production you'd run Chrome in a full browser user session or use containerized Chrome.
"""

import time
import json
import os
import sys
import threading
import websocket
import uuid
import subprocess
import signal
from urllib.parse import urlparse
import urllib.request
import base64
import ssl

BACKEND_WS = os.environ.get('BACKEND_WS') or ("ws://%s:3002" % os.environ.get('BACKEND_HOST',''))
print('BACKEND_WS=', BACKEND_WS)
parsed = urlparse(BACKEND_WS or '')
if not parsed.hostname:
    print('ERROR: Invalid BACKEND_WS hostname; set BACKEND_HOST or BACKEND_WS env var')
    sys.exit(1)
AGENT_ID = os.environ.get('AGENT_ID', 'agent-' + str(uuid.uuid4())[:8])

# Simple state
current_row = None
current_url = None
proc = None
ws = None


def send(msg):
    try:
        if ws:
            ws.send(json.dumps(msg))
    except Exception as e:
        print('send err', e)


def find_iface():
    # pick first non-loopback interface on Linux
    try:
        for iface in os.listdir('/sys/class/net'):
            if iface == 'lo':
                continue
            return iface
    except Exception:
        return None


def read_iface_bytes(iface):
    try:
        base = f'/sys/class/net/{iface}/statistics'
        rx = int(open(os.path.join(base, 'rx_bytes')).read().strip())
        tx = int(open(os.path.join(base, 'tx_bytes')).read().strip())
        return rx + tx
    except Exception:
        return None


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


def screenshot_loop():
    """Periodically capture screenshots and send to backend"""
    while True:
        try:
            time.sleep(3)
            if current_row is not None and current_url is not None:
                screenshot_b64 = capture_screenshot()
                if screenshot_b64:
                    send({'type': 'screenshot', 'agentId': AGENT_ID, 'rowId': current_row, 'data': screenshot_b64})
        except Exception as e:
            print('screenshot loop error', e)


def measure_loop():
    iface = find_iface()
    if not iface:
        print('No network interface found; sending zeros')
    prev = read_iface_bytes(iface) if iface else None
    while True:
        time.sleep(1)
        now = read_iface_bytes(iface) if iface else None
        if prev is not None and now is not None:
            delta = now - prev
            bps = max(0, delta)
            if current_row is not None:
                send({'type': 'bandwidth', 'agentId': AGENT_ID, 'rowId': current_row, 'bytesPerSec': bps})
        prev = now


def kill_proc():
    global proc
    try:
        if proc and proc.poll() is None:
            proc.terminate()
            time.sleep(1)
            if proc.poll() is None:
                proc.kill()
    except Exception:
        pass


def on_message(_, message):
    global current_row, current_url, proc
    try:
        msg = json.loads(message)
    except Exception:
        return
    if msg.get('type') == 'open':
        rowId = msg.get('rowId')
        url = msg.get('url')
        print('open', rowId, url)
        current_row = rowId
        current_url = url
        # Launch Chrome (non-headless recommended in VM) best-effort
        try:
            kill_proc()
        except Exception:
            pass
        try:
            user_data = f"/tmp/illy-{AGENT_ID}-{rowId}"
            cmd = ['google-chrome', '--no-sandbox', '--disable-gpu', '--user-data-dir=' + user_data, url]
            proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            print('failed launching chrome', e)
            # Try to fetch the page HTML and send it back to backend for viewing (best-effort)
            try:
                try:
                    with urllib.request.urlopen(url, timeout=10) as resp:
                        html = resp.read().decode('utf-8', errors='replace')
                except Exception as e:
                    html = f"<html><body><pre>fetch error: {e}</pre></body></html>"
                # truncate to avoid huge messages
                if len(html) > 200000:
                    html = html[:200000] + '\n<!-- truncated -->'
                send({'type': 'render', 'rowId': rowId, 'html': html})
            except Exception as e:
                print('failed sending render', e)


def on_open(wsapp):
    print('connected to backend ws')
    secret = os.environ.get('AGENT_SECRET')
    hello = {'type': 'hello', 'agentId': AGENT_ID}
    if secret:
        hello['secret'] = secret
    send(hello)


def on_close(_):
    print('ws closed')


if __name__ == '__main__':
    t = threading.Thread(target=measure_loop, daemon=True)
    t.start()
    t_screenshot = threading.Thread(target=screenshot_loop, daemon=True)
    t_screenshot.start()
    websocket.enableTrace(False)
    if not BACKEND_WS:
        print('No BACKEND_WS specified; set BACKEND_HOST or BACKEND_WS env var')
    while True:
        try:
            print('attempting websocket connect to', BACKEND_WS)
            ws = websocket.WebSocketApp(BACKEND_WS, on_message=on_message, on_open=on_open, on_close=on_close)
            if (BACKEND_WS or '').startswith('wss://'):
                ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})
            else:
                ws.run_forever()
            print('ws.run_forever returned; retrying in 2s')
        except Exception as e:
            print('ws error', e)
        time.sleep(2)
