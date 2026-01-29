import React, {useEffect, useState, useRef} from 'react'
import axios from 'axios'

// Backend URL: use VITE_API env var, or fallback to deployed backend, or localhost for dev
const DEPLOYED_BACKEND = 'https://ec2-98-92-177-248.compute-1.amazonaws.com:3001';
const API = (import.meta?.env?.VITE_API && import.meta.env.VITE_API.startsWith('http'))
  ? import.meta.env.VITE_API
  : (typeof window !== 'undefined' && window.location?.hostname === 'localhost')
    ? 'http://localhost:3001'
    : DEPLOYED_BACKEND

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

function Row({r, idx, onChange, selected, onSelect}){
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
    setPreviewLoading(true);
    try {
      const res = await fetch(API + '/screenshot/' + r.id);
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

export default function App(){
  const [rows, setRows] = useState(defaultRows)
  const [selected, setSelected] = useState(new Set())
  const [backendStatus, setBackendStatus] = useState('connecting')
  const [backendStarting, setBackendStarting] = useState(false)
  const wsRef = useRef(null)

  useEffect(()=>{
    // initial fetch
    fetchRows().catch(e => {
      console.error('Failed to fetch rows:', e);
      setBackendStatus('offline');
    });
    // connect to backend frontend WS for live updates
    try {
      let wsUrl;
      // Derive WS URL from API constant
      if (API.startsWith('https://')) {
        const u = new URL(API);
        wsUrl = 'wss://' + u.host + '/front';
      } else if (API.startsWith('http://')) {
        const u = new URL(API);
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
              // attach agent ip info to rows for display
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
      ws.addEventListener('close', ()=>{ console.warn('frontend ws closed'); wsRef.current = null; setBackendStatus('offline'); });
    } catch(e){ console.error('ws connect err', e); }
  },[])

  async function fetchRows(){
    const res = await axios.get(API+'/rows');
    setRows(res.data);
  }

  async function connectToBackend(){
    setBackendStarting(true);
    try {
      const maxAttempts = 30;
      let attempt = 0;
      
      const checkHealth = async () => {
        try {
          const res = await axios.get(API + '/health', { timeout: 2000 });
          if (res.status === 200) {
            setBackendStatus('connected');
            setBackendStarting(false);
            await fetchRows();
            return true;
          }
        } catch (e) {
          // backend not yet online
        }
        return false;
      };

      // Quick check if already online
      if (await checkHealth()) {
        return;
      }

      // Poll for backend to come online
      while (attempt < maxAttempts && !await checkHealth()) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (attempt >= maxAttempts) {
        alert('Could not connect to backend. Please verify the Oracle VMs are running and the backend is online.');
        setBackendStatus('offline');
      }
    } catch (e) {
      console.error('Error connecting to backend:', e);
      alert('Failed to connect to backend.');
    } finally {
      setBackendStarting(false);
    }
  }

  function onChange(id, url){
    const newRows = rows.map(r=> r.id===id? {...r,url}:r);
    setRows(newRows);
    // send shallow update (debounce omitted)
    axios.post(API+'/rows',{rows:newRows.map(r=>({id:r.id,url:r.url}))}).catch(()=>{});
  }

  function onSelect(id){
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  async function runSelected(){
    const rowIds = Array.from(selected);
    if (rowIds.length===0) return alert('Select rows to run');
    await axios.post(API+'/run',{rowIds});
    // optimistic state
    fetchRows();
  }

  function selectAll(){
    const s = new Set(rows.map(r=>r.id)); setSelected(s);
  }

  function clearSelection(){
    setSelected(new Set());
  }

  return (
    <div className="app">
      <div className="card">
        <header>
          <div>
            <h1>IllyBoost</h1>
            <p>Monitor per-URL bandwidth across guest VMs — select rows and click Run.</p>
            <div style={{display:'flex', alignItems:'center', gap:'12px', marginTop:'6px'}}>
              <button className={`status-button ${backendStatus}`} onClick={connectToBackend} disabled={backendStarting}>
                {backendStarting ? '⟳ Connecting...' : backendStatus === 'connected' ? '● Connected' : backendStatus === 'connecting' ? '◌ Connecting...' : '○ Connect Backend'}
              </button>
              {backendStatus === 'connected' && <span className="backend-ready-hint">✓ Oracle VMs online — you can run URLs</span>}
            </div>
          </div>
          <div className="controls">
            <button className="btn" onClick={runSelected}>Run Selected</button>
            <button className="btn ghost" onClick={fetchRows}>Refresh</button>
            <button className="btn ghost" onClick={selectAll}>Select All</button>
            <button className="btn ghost" onClick={clearSelection}>Clear</button>
          </div>
        </header>
      </div>

      <div className="card rows" style={{marginTop:12}}>
        {rows.map((r,idx)=> (
          <Row key={r.id} r={r} idx={idx} onChange={onChange} selected={selected.has(r.id)} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

// Simple route helper: when user clicks View we open a blank window and fetch /render/:id and write it.
// Add a small script to handle /__view query when loaded in a browser.
if (typeof window !== 'undefined') {
  if (window.location.pathname === '/__view') {
    const params = new URLSearchParams(window.location.search);
    const row = params.get('row');
    if (row) {
      (async ()=>{
        try {
          const res = await fetch(API + '/render/' + row);
          if (res.status === 204) {
            document.body.innerHTML = '<pre>No render available yet</pre>';
            return;
          }
          const html = await res.text();
          // write the HTML into the window
          document.open();
          document.write(html);
          document.close();
        } catch (e) {
          document.body.innerHTML = '<pre>failed to fetch render: '+e+'</pre>';
        }
      })();
    }
  }
}
