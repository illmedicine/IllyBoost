import React, {useEffect, useState, useRef} from 'react'
import axios from 'axios'

// Get recent backends from localStorage
function getRecentBackends() {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('illyboost_recent_backends');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load recent backends from localStorage:', e);
    }
  }
  return [];
}

// Save a backend URL to recent list
function saveToRecentBackends(url) {
  if (typeof window === 'undefined' || !url) return;
  try {
    let recent = getRecentBackends();
    // Remove if already exists (will re-add at front)
    recent = recent.filter(r => r !== url);
    // Add to front
    recent.unshift(url);
    // Keep only last 5
    recent = recent.slice(0, 5);
    localStorage.setItem('illyboost_recent_backends', JSON.stringify(recent));
  } catch (e) {
    console.warn('Failed to save recent backends to localStorage:', e);
  }
}

// Check for backend URL in URL parameters (for easy sharing)
function getBackendFromUrlParams() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const backendParam = params.get('backend');
    if (backendParam) {
      // Support both formats: "IP:PORT" and "http://IP:PORT"
      if (backendParam.startsWith('http://') || backendParam.startsWith('https://')) {
        return backendParam;
      }
      // Assume HTTP if just IP:PORT
      return `http://${backendParam}`;
    }
  }
  return null;
}

// Backend URL: check URL params first, then localStorage, then VITE_API env var, then derive from hostname
function getBackendUrl() {
  // First check URL parameters (highest priority - allows sharing links)
  const urlParamBackend = getBackendFromUrlParams();
  if (urlParamBackend) {
    // Save to localStorage and recent list for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('illyboost_backend_url', urlParamBackend);
      saveToRecentBackends(urlParamBackend);
      // Clean URL to remove the parameter (optional - keeps URL clean)
      const url = new URL(window.location.href);
      url.searchParams.delete('backend');
      window.history.replaceState({}, '', url.toString());
    }
    return urlParamBackend;
  }
  
  // Then check localStorage for user-configured URL
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('illyboost_backend_url');
    if (saved && saved.startsWith('http')) {
      return saved;
    }
  }
  
  // Then check VITE_API environment variable
  if (import.meta?.env?.VITE_API && import.meta.env.VITE_API.startsWith('http')) {
    return import.meta.env.VITE_API;
  }
  
  // For localhost development, use localhost
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  
  // For GitHub Pages or other static hosts, return null (need manual configuration)
  // Check if hostname ends with .github.io (exact domain match)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname === 'github.io' || hostname.endsWith('.github.io')) {
      return null;
    }
  }
  
  // For other deployed environments, try to derive from hostname
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  
  return 'http://localhost:3001';
}

const initialBackendUrl = getBackendUrl();

function formatBytes(b){
  if (!b) return '0 B';
  if (b > 1e9) return (b/1e9).toFixed(2) + ' GB';
  if (b > 1e6) return (b/1e6).toFixed(2) + ' MB';
  if (b > 1e3) return (b/1e3).toFixed(2) + ' KB';
  return Math.round(b) + ' B';
}

function TrafficIcon(){
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12h3l3-8 4 16 3-12 2 4h4" stroke="#9fbff6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LinkIcon(){
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 13.5l-3 3a4 4 0 0 1-5.657-5.657l3-3a4 4 0 0 1 5.657 5.657zM13.5 10.5l3-3a4 4 0 0 1 5.657 5.657l-3 3a4 4 0 0 1-5.657-5.657z" stroke="#cfefff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Row({r, idx, onChange, selected, onSelect, apiUrl}){
  const percent = Math.min(100, (r.bw||0) / 500000 * 100);
  const active = (r.bw||0) > 20000;
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewData, setPreviewData] = React.useState(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  const hasLiveScreenshot = !!(r && r.screenshot);
  const liveScreenshotSrc = hasLiveScreenshot ? ('data:image/png;base64,' + r.screenshot) : null;

  function openLivePreview() {
    if (!hasLiveScreenshot) return;
    setPreviewData({ screenshot: r.screenshot, time: r.screenshotTime });
    setPreviewOpen(true);
  }

  async function openPreview() {
    if (!apiUrl) {
      setPreviewData({error: 'Backend not configured'});
      setPreviewOpen(true);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch(apiUrl + '/screenshot/' + r.id);
      if (res.status === 204) {
        setPreviewData({error: 'No screenshot available yet'});
        return;
      }
      const data = await res.json();
      if (data.screenshot) {
        setPreviewData(data);
      } else {
        setPreviewData({error: 'No screenshot data'});
      }
    } catch (e) {
      setPreviewData({error: 'Failed to load: ' + e.message});
    } finally {
      setPreviewLoading(false);
    }
    setPreviewOpen(true);
  }

  return (
    <div className={`row ${active? 'active':''}`}>
      <input type="checkbox" checked={selected} onChange={()=>onSelect(r.id)} />
      <div className="index">{r.id}</div>
      <div>
        <div style={{display:'flex',alignItems:'center'}}>
          <LinkIcon />
          <input className="url" value={r.url} onChange={e=>onChange(r.id,e.target.value)} placeholder="Enter URL (e.g. https://example.com)" />
        </div>
      </div>
      <div style={{position:'relative'}}>
        <div className="meter">
          <div className="bar" style={{width: percent+'%'}}></div>
          <div className="glow" style={{width: percent+'%'}}></div>
        </div>
      </div>
      <div className={`bw ${active? 'small':''}`}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end'}}>
          <TrafficIcon />
          <div style={{minWidth:86}}>{formatBytes(r.bw)}/s</div>
        </div>
      </div>
      <div className="vm">
        <span className={`status-dot ${active? 'pulse active':''}`}></span>
        {r.vm? `${r.vm}${r.vmIp? ' ('+r.vmIp+')':''}` : '-'}
        <div style={{marginTop:6, fontSize:12, color: r.state === 'error' ? '#ff6b6b' : 'rgba(255,255,255,0.6)'}}>
          {r.state || 'idle'}{r.error ? `: ${r.error}` : ''}
        </div>

        {hasLiveScreenshot && (
          <div className="thumb-wrap" onClick={openLivePreview} title="Click to enlarge">
            <img className="thumb" src={liveScreenshotSrc} alt="Live preview" />
          </div>
        )}

        <div style={{marginTop:6, display:'flex', gap:'6px'}}>
          <button className="btn small preview-btn" onClick={openPreview} disabled={previewLoading || !r.vm || r.state === 'error'}>
            {previewLoading ? '⏳' : '📸'}
          </button>
          <button className="btn small" onClick={()=>window.open(new URL('./__view?row='+r.id, window.location.href).toString(), '_blank')}>View</button>
        </div>
      </div>

      {previewOpen && (
        <div className="preview-modal active" onClick={(e) => e.target === e.currentTarget && setPreviewOpen(false)}>
          <div className="preview-modal-content">
            <button className="preview-modal-close" onClick={() => setPreviewOpen(false)}>×</button>
            <div className="preview-modal-title">Screenshot - Row {r.id}: {r.url}</div>
            {previewLoading ? (
              <div className="preview-loading">Loading screenshot...</div>
            ) : previewData?.error ? (
              <div className="preview-error">{previewData.error}</div>
            ) : previewData?.screenshot ? (
              <img className="preview-screenshot" src={'data:image/png;base64,' + previewData.screenshot} alt="URL preview" />
            ) : (
              <div className="preview-error">No screenshot data</div>
            )}
          </div>
        </div>
      )}
    </div>
  )

}

// Initialize with 20 empty rows so UI is always visible
const defaultRows = Array.from({length:20}, (_,i)=>({id:i+1,url:'',state:'idle',vm:null,bw:0}));

// Backend Configuration Modal Component
function BackendConfigModal({ isOpen, onClose, currentUrl, onSave }) {
  const [inputUrl, setInputUrl] = React.useState(currentUrl || '');
  const [recentBackends, setRecentBackends] = React.useState([]);
  const [showHelp, setShowHelp] = React.useState(false);
  
  React.useEffect(() => {
    setRecentBackends(getRecentBackends());
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    let url = inputUrl.trim();
    // Auto-add http:// if user just entered IP:PORT
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      saveToRecentBackends(url);
      onSave(url);
      onClose();
    } else {
      alert('Please enter a valid URL or IP:PORT (e.g., 123.45.67.89:3001)');
    }
  };
  
  const handleSelectRecent = (url) => {
    setInputUrl(url);
  };
  
  const handleDeleteRecent = (urlToDelete, e) => {
    e.stopPropagation();
    const updated = recentBackends.filter(u => u !== urlToDelete);
    localStorage.setItem('illyboost_recent_backends', JSON.stringify(updated));
    setRecentBackends(updated);
  };
  
  return (
    <div className="preview-modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="preview-modal-content" style={{maxWidth: '550px'}}>
        <button className="preview-modal-close" onClick={onClose}>×</button>
        <div className="preview-modal-title">⚙️ Configure Backend Server</div>
        
        {/* Recent Backends Section */}
        {recentBackends.length > 0 && (
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '12px'}}>
              📋 Recent Backends (click to select):
            </label>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
              {recentBackends.map((url, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSelectRecent(url)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: inputUrl === url ? '1px solid var(--accent1)' : '1px solid rgba(255,255,255,0.15)',
                    background: inputUrl === url ? 'rgba(0,245,160,0.15)' : 'rgba(255,255,255,0.05)',
                    color: inputUrl === url ? 'var(--accent1)' : 'rgba(255,255,255,0.8)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {url.replace('http://', '').replace('https://', '')}
                  <span 
                    onClick={(e) => handleDeleteRecent(url, e)}
                    style={{opacity: 0.5, cursor: 'pointer'}}
                    title="Remove from recent"
                  >×</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '12px'}}>
            Backend URL or IP:PORT:
          </label>
          <input 
            type="text" 
            value={inputUrl} 
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="123.45.67.89:3001 or http://your-backend-ip:3001"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              fontSize: '14px'
            }}
          />
          <div style={{fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px'}}>
            💡 Just enter the IP:PORT — http:// will be added automatically
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '16px'}}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSave}>Save & Connect</button>
        </div>
        
        {/* Help Section */}
        <div style={{borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px'}}>
          <button 
            onClick={() => setShowHelp(!showHelp)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent1)',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {showHelp ? '▼' : '▶'} How do I find my backend IP?
          </button>
          
          {showHelp && (
            <div style={{marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)'}}>
              <p style={{marginBottom: '12px'}}><strong>Option 1: From Terraform Output</strong></p>
              <p style={{marginBottom: '8px', color: 'rgba(255,255,255,0.5)'}}>After running <code style={{background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px'}}>terraform apply</code>, look for:</p>
              <pre style={{background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', overflow: 'auto', marginBottom: '12px'}}>
backend_public_ip = "YOUR_BACKEND_IP"
              </pre>
              
              <p style={{marginBottom: '12px'}}><strong>Option 2: From Oracle Cloud Console</strong></p>
              <ol style={{marginLeft: '16px', color: 'rgba(255,255,255,0.5)'}}>
                <li>Go to Compute → Instances</li>
                <li>Click on "illyboost-backend"</li>
                <li>Copy the "Public IP Address"</li>
              </ol>
              
              <p style={{marginTop: '16px', marginBottom: '8px'}}><strong>Share Link with Backend Pre-configured:</strong></p>
              <p style={{color: 'rgba(255,255,255,0.5)'}}>
                Add <code style={{background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px'}}>?backend=YOUR_IP:3001</code> to the URL, e.g.:<br/>
                <code style={{background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', display: 'block', marginTop: '4px', wordBreak: 'break-all'}}>
                  {window.location.origin}{window.location.pathname}?backend=YOUR_IP:3001
                </code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [rows, setRows] = useState(defaultRows)
  const [selected, setSelected] = useState(new Set())
  const [backendStatus, setBackendStatus] = useState(initialBackendUrl ? 'connecting' : 'unconfigured')
  const [backendStarting, setBackendStarting] = useState(false)
  const [apiUrl, setApiUrl] = useState(initialBackendUrl)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const wsRef = useRef(null)

  // Connect to backend WebSocket
  const connectWebSocket = (url) => {
    if (!url) return;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    try {
      let wsUrl;
      if (url.startsWith('https://')) {
        const u = new URL(url);
        wsUrl = 'wss://' + u.host + '/front';
      } else if (url.startsWith('http://')) {
        const u = new URL(url);
        wsUrl = 'ws://' + u.host.replace(':3001', ':3003');
      } else {
        wsUrl = 'ws://localhost:3003';
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.addEventListener('open', () => { setBackendStatus('connected'); });
      ws.addEventListener('message', (ev)=>{
        try{
          const msg = JSON.parse(ev.data);
          if (msg.type === 'rows'){
            setBackendStatus('connected');
            if (msg.agents) {
              const agents = msg.agents;
              const updated = msg.rows.map(r=> ({...r, vmIp: agents && r.vm? agents[r.vm] : null}));
              setRows(updated);
            } else {
              setRows(msg.rows);
            }
          }
        }catch(e){}
      });
      ws.addEventListener('error', () => { setBackendStatus('offline'); });
      ws.addEventListener('close', ()=>{ 
        console.warn('frontend ws closed'); 
        wsRef.current = null; 
        setBackendStatus('offline'); 
      });
    } catch(e){ 
      console.error('ws connect err', e); 
      setBackendStatus('offline');
    }
  };

  useEffect(()=>{
    if (!apiUrl) {
      setBackendStatus('unconfigured');
      return;
    }
    
    // initial fetch
    fetchRows().catch(e => {
      console.error('Failed to fetch rows:', e);
      setBackendStatus('offline');
    });
    // connect to WebSocket
    connectWebSocket(apiUrl);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  },[apiUrl])

  async function fetchRows(){
    if (!apiUrl) return;
    const res = await axios.get(apiUrl+'/rows');
    setRows(res.data);
  }

  async function connectToBackend(){
    if (!apiUrl) {
      setShowConfigModal(true);
      return;
    }
    
    setBackendStarting(true);
    try {
      const maxAttempts = 30;
      let attempt = 0;
      
      const checkHealth = async () => {
        try {
          const res = await axios.get(apiUrl + '/health', { timeout: 2000 });
          if (res.status === 200) {
            setBackendStatus('connected');
            setBackendStarting(false);
            await fetchRows();
            connectWebSocket(apiUrl);
            return true;
          }
        } catch (e) {
          // backend not yet online
        }
        return false;
      };

      if (await checkHealth()) {
        return;
      }

      while (attempt < maxAttempts && !await checkHealth()) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (attempt >= maxAttempts) {
        alert('Could not connect to backend. Please verify the Oracle VMs are running and the backend is online, or click the ⚙️ button to configure a different backend URL.');
        setBackendStatus('offline');
      }
    } catch (e) {
      console.error('Error connecting to backend:', e);
      alert('Failed to connect to backend. Click ⚙️ to configure the backend URL.');
    } finally {
      setBackendStarting(false);
    }
  }

  function handleSaveBackendUrl(newUrl) {
    localStorage.setItem('illyboost_backend_url', newUrl);
    setApiUrl(newUrl);
    setBackendStatus('connecting');
    // Immediately attempt to connect after configuration
    connectWebSocket(newUrl);
  }

  function onChange(id, url){
    const newRows = rows.map(r=> r.id===id? {...r,url}:r);
    setRows(newRows);
    if (apiUrl) {
      axios.post(apiUrl+'/rows',{rows:newRows.map(r=>({id:r.id,url:r.url}))}).catch(()=>{});
    }
  }

  function onSelect(id){
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  async function runSelected(){
    if (!apiUrl) {
      setShowConfigModal(true);
      return;
    }
    const rowIds = Array.from(selected);
    if (rowIds.length===0) return alert('Select rows to run');
    try {
      await axios.post(apiUrl+'/run',{rowIds});
      fetchRows();
    } catch (e) {
      alert('Failed to run. Make sure the backend is online. Error: ' + e.message);
    }
  }

  function selectAll(){
    const s = new Set(rows.map(r=>r.id)); setSelected(s);
  }

  function clearSelection(){
    setSelected(new Set());
  }

  const getStatusButtonText = () => {
    if (backendStarting) return '⟳ Connecting...';
    if (backendStatus === 'connected') return '● Connected';
    if (backendStatus === 'connecting') return '◌ Connecting...';
    if (backendStatus === 'unconfigured') return '⚙️ Configure Backend';
    return '○ Connect Backend';
  };

  return (
    <div className="app">
      <div className="card">
        <header>
          <div>
            <h1>IllyBoost</h1>
            <p>Monitor per-URL bandwidth across guest VMs — select rows and click Run.</p>
            <div style={{display:'flex', alignItems:'center', gap:'12px', marginTop:'6px'}}>
              <button 
                className={`status-button ${backendStatus}`} 
                onClick={backendStatus === 'unconfigured' ? () => setShowConfigModal(true) : connectToBackend} 
                disabled={backendStarting}
              >
                {getStatusButtonText()}
              </button>
              <button 
                className="btn ghost small" 
                onClick={() => setShowConfigModal(true)}
                title="Configure backend URL"
                style={{padding: '6px 10px', fontSize: '14px'}}
              >
                ⚙️
              </button>
              {backendStatus === 'connected' && <span className="backend-ready-hint">✓ Backend online — you can run URLs</span>}
              {backendStatus === 'unconfigured' && <span className="backend-ready-hint" style={{color: '#ffaa00'}}>⚠️ Click to configure backend URL</span>}
              {backendStatus === 'offline' && <span className="backend-ready-hint" style={{color: '#ff6b6b'}}>✗ Backend offline</span>}
            </div>
            {apiUrl && <div style={{fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px'}}>Backend: {apiUrl}</div>}
          </div>
          <div className="controls">
            <button className="btn" onClick={runSelected} disabled={backendStatus !== 'connected'}>Run Selected</button>
            <button className="btn ghost" onClick={fetchRows} disabled={!apiUrl}>Refresh</button>
            <button className="btn ghost" onClick={selectAll}>Select All</button>
            <button className="btn ghost" onClick={clearSelection}>Clear</button>
          </div>
        </header>
      </div>

      <div className="card rows" style={{marginTop:12}}>
        {rows.map((r,idx)=> (
          <Row key={r.id} r={r} idx={idx} onChange={onChange} selected={selected.has(r.id)} onSelect={onSelect} apiUrl={apiUrl} />
        ))}
      </div>
      
      <BackendConfigModal 
        isOpen={showConfigModal} 
        onClose={() => setShowConfigModal(false)}
        currentUrl={apiUrl}
        onSave={handleSaveBackendUrl}
      />
    </div>
  )
}

// Simple route helper: when user clicks View we open a blank window and fetch /render/:id and write it.
// Add a small script to handle /__view query when loaded in a browser.
if (typeof window !== 'undefined') {
  if (window.location.pathname === '/__view' || window.location.pathname.endsWith('/__view')) {
    const params = new URLSearchParams(window.location.search);
    const row = params.get('row');
    if (row) {
      (async ()=>{
        try {
          // Get API URL from localStorage or use initialBackendUrl
          const savedUrl = localStorage.getItem('illyboost_backend_url');
          const apiUrl = savedUrl || getBackendUrl();
          
          if (!apiUrl) {
            const pre = document.createElement('pre');
            pre.textContent = 'Backend not configured. Please configure the backend URL in the main app first.';
            document.body.appendChild(pre);
            return;
          }
          
          const res = await fetch(apiUrl + '/render/' + row);
          if (res.status === 204) {
            const pre = document.createElement('pre');
            pre.textContent = 'No render available yet';
            document.body.appendChild(pre);
            return;
          }
          const html = await res.text();
          // write the HTML into the window
          document.open();
          document.write(html);
          document.close();
        } catch (e) {
          const pre = document.createElement('pre');
          pre.textContent = 'Failed to fetch render: ' + String(e);
          document.body.appendChild(pre);
        }
      })();
    }
  }
}
