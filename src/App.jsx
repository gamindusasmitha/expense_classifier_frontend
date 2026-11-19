import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, Sparkles, Plus, Trash2, Upload, X, Sun, Moon, AlertCircle, ScanLine, Image as ImageIcon } from 'lucide-react';

/* ---------- Settings ---------- */
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const MAX_BYTES = 5 * 1024 * 1024;                // same 5 MB limit as the backend
const MAX_ITEMS = 100;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SAMPLE_ITEMS = ['Fresh Organic Milk 1L', 'Uber Ride to Office', 'Monthly Electricity Bill', 'Chicken Burger Combo Meal'];

/* Category tag colors (they sit on the paper receipt, so they are the same in both themes) */
const TAGS = {
  Groceries: { bg: '#dff3e7', fg: '#14663a' },
  Transport: { bg: '#dbe9fb', fg: '#1d4f9a' },
  Utilities: { bg: '#fbeccb', fg: '#8a5a00' },
  Dining: { bg: '#fbdde2', fg: '#a3203a' },
  Shopping: { bg: '#e8def8', fg: '#5b30a3' },
  default: { bg: '#e7e5df', fg: '#4a4a45' },
};
const tagOf = (c) => TAGS[c] || TAGS.default;

/* Zigzag bottom edge of the receipt */
const TEETH = 24;
const CLIP = `polygon(0 0, 100% 0, ${Array.from({ length: TEETH + 1 }, (_, k) => {
  const i = TEETH - k;
  return `${(i * 100) / TEETH}% ${i % 2 === 0 ? '100%' : 'calc(100% - 9px)'}`;
}).join(', ')})`;

/* ---------- Talk to the backend and return friendly error messages ---------- */
async function callApi(path, options) {
  let res;
  try {
    res = await fetch(API_URL + path, options);
  } catch {
    throw new Error("Can't reach the server. Start the FastAPI backend (port 8000) and try again.");
  }
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = typeof j.detail === 'string' ? j.detail : ''; } catch { /* no JSON */ }
    if (res.status === 429) detail = 'Too many requests. Please wait a minute and try again.';
    throw new Error(detail || `Something went wrong on the server (${res.status}).`);
  }
  return res.json();
}

/* ---------- Styles (kept in this file, so no Tailwind config change is needed) ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
.app{--paper:#fdfcf8;--paper-ink:#1c1c1a;--paper-muted:#76766f;--paper-line:#cdc9bd;font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;transition:background-color .35s,color .35s}
.app[data-theme=light]{--bg:#eceff3;--surface:#fff;--field:#f1f3f6;--ink:#14161a;--muted:#5d6572;--line:#dde1e8;--accent:#d9430b;--on-accent:#fff;--glow:rgba(217,67,11,.28)}
.app[data-theme=dark]{--bg:#0d0f13;--surface:#171a20;--field:#1f232b;--ink:#eceef2;--muted:#9099a8;--line:#2a2f39;--accent:#ff7a45;--on-accent:#1a0d06;--glow:rgba(255,122,69,.35)}
.app *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.disp{font-family:'Bricolage Grotesque','DM Sans',sans-serif}
.mono{font-family:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace}
.muted{color:var(--muted)} .pm{color:var(--paper-muted)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:20px;transition:background-color .35s,border-color .35s}
.field{background:var(--field);border:1px solid var(--line);color:var(--ink);border-radius:12px;transition:border-color .2s,box-shadow .2s,background-color .35s}
.field:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 18px;border:0;border-radius:12px;background:var(--accent);color:var(--on-accent);font:inherit;font-weight:600;cursor:pointer;transition:transform .2s,box-shadow .2s,opacity .2s}
.btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 24px -12px var(--accent)}
.btn:active:not(:disabled){transform:scale(.99)}
.btn:disabled{opacity:.6;cursor:not-allowed}
.btn::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);transform:translateX(-110%);transition:transform .7s}
.btn:hover:not(:disabled)::after{transform:translateX(110%)}
.spin{width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:spin .7s linear infinite}
.icon-btn{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;border:0;background:transparent;color:var(--muted);cursor:pointer;transition:color .2s,background-color .2s}
.icon-btn:hover{color:#e5484d;background:var(--field)}
.tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;background:var(--field);border-radius:14px;padding:4px}
.tabs button{position:relative;z-index:1;padding:10px;border:0;background:transparent;color:var(--muted);font:inherit;font-weight:600;border-radius:10px;cursor:pointer;transition:color .25s}
.tabs button[aria-selected=true]{color:var(--ink)}
.pill{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);background:var(--surface);border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .4s cubic-bezier(.4,1.3,.6,1)}
.drop{border:2px dashed var(--line);border-radius:16px;padding:34px 20px;text-align:center;cursor:pointer;transition:border-color .2s,background-color .2s,transform .2s}
.drop:hover,.drop.over{border-color:var(--accent);background:var(--field)}
.drop.over{transform:scale(1.015)}
.preview{position:relative;overflow:hidden;border-radius:14px;background:var(--field)}
.preview img{display:block;width:100%;max-height:280px;object-fit:contain}
.preview .x{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.55);color:#fff;border-radius:50%}
.scan{position:absolute;left:0;right:0;height:3px;background:var(--accent);box-shadow:0 0 18px 6px var(--glow);animation:scan 1.6s ease-in-out infinite}
.status{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:99px;border:1px solid var(--line);background:var(--surface);font-size:13px;font-weight:500}
.dot{width:8px;height:8px;border-radius:50%}
.dot.on{background:#1fb56f;animation:pulse 2s infinite} .dot.off{background:#e5484d} .dot.wait{background:var(--muted)}
.theme{position:relative;width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer;transition:transform .25s,border-color .2s}
.theme:hover{transform:rotate(18deg) scale(1.06);border-color:var(--accent)}
.theme .ic{position:absolute;inset:0;margin:auto;transition:transform .5s cubic-bezier(.3,1.4,.5,1),opacity .3s}
.app[data-theme=light] .moon{opacity:0;transform:rotate(-90deg) scale(.4)}
.app[data-theme=dark] .sun{opacity:0;transform:rotate(90deg) scale(.4)}
.alert{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;font-size:14px;color:#e5484d;border:1px solid #e5484d;background:color-mix(in srgb,#e5484d 10%,transparent);animation:swap .3s both}
.paper-wrap{filter:drop-shadow(0 14px 22px rgba(0,0,0,.22))}
.paper{background:var(--paper);color:var(--paper-ink);padding:26px 24px 38px;min-height:440px}
.dash{border-top:2px dashed var(--paper-line);margin:14px 0}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px dashed var(--paper-line);animation:print .5s cubic-bezier(.2,.8,.2,1) both}
.tag{font-size:11px;font-weight:500;padding:4px 10px;border-radius:99px;white-space:nowrap}
.barcode{height:36px;opacity:.85;background:repeating-linear-gradient(90deg,var(--paper-ink) 0 2px,transparent 2px 4px,var(--paper-ink) 4px 5px,transparent 5px 9px,var(--paper-ink) 9px 12px,transparent 12px 14px)}
.sk{height:14px;border-radius:6px;background:linear-gradient(90deg,#e9e6dc 25%,#f6f3ea 50%,#e9e6dc 75%);background-size:200% 100%;animation:shimmer 1.2s linear infinite}
.swap{animation:swap .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes swap{from{opacity:0;transform:translateY(8px)}}
@keyframes print{from{opacity:0;transform:translateY(-8px);clip-path:inset(0 0 100% 0)}to{opacity:1;transform:none;clip-path:inset(0)}}
@keyframes scan{0%,100%{top:0}50%{top:calc(100% - 3px)}}
@keyframes shimmer{to{background-position:-200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(31,181,111,.5)}70%,100%{box-shadow:0 0 0 8px rgba(31,181,111,0)}}
@media (prefers-reduced-motion:reduce){.app *,.app *::before,.app *::after{animation:none!important;transition:none!important}}
`;

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { const t = localStorage.getItem('theme'); if (t) return t; } catch { /* ignore */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [tab, setTab] = useState('scan');
  const [items, setItems] = useState(SAMPLE_ITEMS);
  const [newItem, setNewItem] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState(null);
  const [note, setNote] = useState('');
  const [stamp, setStamp] = useState('');
  const [runId, setRunId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(null);

  useEffect(() => { try { localStorage.setItem('theme', theme); } catch { /* ignore */ } }, [theme]);

  /* Real backend status (checks every 20 seconds) */
  useEffect(() => {
    let alive = true;
    const ping = () => fetch(API_URL + '/').then((r) => alive && setOnline(r.ok)).catch(() => alive && setOnline(false));
    ping();
    const id = setInterval(ping, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  /* Image preview */
  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (f) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) { setError('Please choose a JPG, PNG or WEBP image.'); return; }
    if (f.size > MAX_BYTES) { setError('That image is larger than 5 MB. Please choose a smaller one.'); return; }
    setError(null);
    setFile(f);
  };

  const addItem = (e) => {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    if (items.length >= MAX_ITEMS) { setError(`You can add up to ${MAX_ITEMS} items.`); return; }
    setError(null);
    setItems([...items, text]);
    setNewItem('');
  };

  const run = async (path, options) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi(path, options);
      setResults(data.breakdown || []);
      setNote(data.message || '');
      setStamp(new Date().toLocaleString());
      setRunId((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const scan = () => {
    if (!file) { setError('Choose a receipt image first.'); return; }
    const body = new FormData();
    body.append('file', file);
    run('/upload-receipt-image', { method: 'POST', body });
  };
  const classify = () => {
    if (!items.length) { setError('Add at least one item first.'); return; }
    run('/predict-expense', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) });
  };

  const counts = useMemo(() => (results || []).reduce((m, r) => ({ ...m, [r.predicted_category]: (m[r.predicted_category] || 0) + 1 }), {}), [results]);
  const statusText = online === null ? 'Checking server' : online ? 'Server connected' : 'Server offline';

  return (
    <div className="app" data-theme={theme}>
      <style>{CSS}</style>
      <div className="mx-auto max-w-6xl px-5 py-8 md:py-12">

        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
              <Receipt size={26} />
            </div>
            <div>
              <h1 className="disp text-2xl font-bold leading-tight">Smart Receipt Analyzer</h1>
              <p className="muted text-sm">Scan a receipt or type items. Each one is sorted into a spending category.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="status" role="status">
              <span className={`dot ${online === null ? 'wait' : online ? 'on' : 'off'}`} /> {statusText}
            </span>
            <button className="theme" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <Sun className="ic sun" size={20} />
              <Moon className="ic moon" size={20} />
            </button>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-2">

          {/* Input panel */}
          <section className="card p-5 md:p-6">
            <div className="tabs" role="tablist">
              <span className="pill" style={{ transform: tab === 'type' ? 'translateX(100%)' : 'none' }} />
              <button role="tab" aria-selected={tab === 'scan'} onClick={() => setTab('scan')}>Scan receipt</button>
              <button role="tab" aria-selected={tab === 'type'} onClick={() => setTab('type')}>Type items</button>
            </div>

            <div key={tab} className="swap mt-5">
              {tab === 'scan' ? (
                <>
                  {!file ? (
                    <label className={`drop block ${dragOver ? 'over' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}>
                      <Upload className="muted mx-auto mb-3" size={34} />
                      <p className="font-semibold">Drop a receipt photo here, or click to browse</p>
                      <p className="muted mt-1 text-sm">JPG, PNG or WEBP, up to 5 MB. A flat, well-lit photo reads best.</p>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={(e) => { pickFile(e.target.files[0]); e.target.value = ''; }} />
                    </label>
                  ) : (
                    <>
                      <div className="preview">
                        <img src={preview} alt="Receipt preview" />
                        {loading && <div className="scan" />}
                        {!loading && (
                          <button className="icon-btn x" type="button" aria-label="Remove image" onClick={() => setFile(null)}>
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <p className="muted mt-2 flex items-center gap-2 truncate text-sm"><ImageIcon size={15} /> {file.name}</p>
                    </>
                  )}
                  <button className="btn mt-4" type="button" onClick={scan} disabled={loading || !file}>
                    {loading ? <><span className="spin" /> Scanning</> : <><ScanLine size={18} /> Scan and classify</>}
                  </button>
                  <p className="muted mt-3 text-xs">Your image is read on the server and is not saved.</p>
                </>
              ) : (
                <>
                  <form onSubmit={addItem} className="mb-4 flex gap-2">
                    <input className="field flex-1 px-4 py-3 text-sm" value={newItem} maxLength={200}
                      onChange={(e) => setNewItem(e.target.value)} placeholder="e.g. Supermarket groceries" aria-label="New item" />
                    <button className="btn !w-auto px-5" type="submit"><Plus size={18} /> Add</button>
                  </form>

                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="muted">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                    {items.length > 0 && <button type="button" className="muted underline underline-offset-4" onClick={() => setItems([])}>Clear all</button>}
                  </div>
                  <ul className="mb-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {items.length === 0 && <li className="muted py-6 text-center text-sm">No items yet. Add one above.</li>}
                    {items.map((item, i) => (
                      <li key={item + i} className="swap field flex items-center justify-between gap-3 py-1.5 pl-4 pr-1.5 text-sm">
                        <span className="min-w-0 break-words">{item}</span>
                        <button className="icon-btn" type="button" aria-label={`Remove ${item}`} onClick={() => setItems(items.filter((_, k) => k !== i))}>
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button className="btn" type="button" onClick={classify} disabled={loading || items.length === 0}>
                    {loading ? <><span className="spin" /> Classifying</> : <><Sparkles size={18} /> Classify items</>}
                  </button>
                </>
              )}
            </div>

            {error && (
              <div className="alert mt-4" role="alert"><AlertCircle size={18} className="mt-0.5 flex-none" /> <span>{error}</span></div>
            )}
          </section>

          {/* Receipt results */}
          <section aria-live="polite" className="paper-wrap">
            <div className="paper mono" style={{ clipPath: CLIP }}>
              <div className="text-center">
                <div className="disp text-xl font-bold tracking-wide">SPENDING RECEIPT</div>
                <div className="pm text-xs">{stamp || 'Waiting for items'}</div>
              </div>
              <div className="dash" />

              {loading ? (
                <div className="space-y-4 py-2">
                  {[80, 60, 72, 50].map((w, i) => <div key={i} className="sk" style={{ width: `${w}%` }} />)}
                  <p className="pm pt-2 text-center text-xs">Reading your items...</p>
                </div>
              ) : results === null ? (
                <div className="pm flex flex-col items-center py-16 text-center">
                  <Receipt size={44} strokeWidth={1.4} />
                  <p className="mt-3 max-w-[26ch] text-sm">Your receipt prints here. Scan a photo or type items, then press the button.</p>
                </div>
              ) : results.length === 0 ? (
                <p className="py-12 text-center text-sm">{note || 'No items were found.'}</p>
              ) : (
                <>
                  <ul key={runId}>
                    {results.map((r, i) => {
                      const t = tagOf(r.predicted_category);
                      return (
                        <li key={i} className="row" style={{ animationDelay: `${Math.min(i, 20) * 80}ms` }}>
                          <span className="min-w-0 break-words text-sm">{r.item_description}</span>
                          <span className="tag" style={{ background: t.bg, color: t.fg }}>{r.predicted_category}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="dash" />
                  <div className="flex justify-between text-sm font-medium"><span>ITEMS</span><span>{results.length}</span></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(counts).map(([c, n]) => (
                      <span key={c} className="tag" style={{ background: tagOf(c).bg, color: tagOf(c).fg }}>{c} x{n}</span>
                    ))}
                  </div>
                  <div className="dash" />
                  <div className="barcode" />
                  <p className="mt-3 text-center text-xs tracking-widest">THANK YOU</p>
                </>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}