import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonitors, createMonitor, updateMonitor, deleteMonitor, exportMonitors, importMonitors } from '../api';
import { Globe, Activity, CheckCircle, XCircle } from '../components/Icons';

const AllSites: React.FC = () => {
  const navigate = useNavigate();
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState('');
  const [editingMonitor, setEditingMonitor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '', url: '', method: 'GET', interval_seconds: 60, timeout_seconds: 30,
    expected_status_codes: '200-299', auth_type: 'none', auth_value: '', keyword: '',
    keyword_type: 'present', headers: [] as { key: string; value: string }[],
    body: '', max_retries: 3,
  });

  const fetchMonitors = useCallback(async () => {
    try {
      const data = await getMonitors();
      setMonitors(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 10000);
    return () => clearInterval(interval);
  }, [fetchMonitors]);

  const filteredMonitors = useMemo(() => {
    return monitors.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [monitors, searchQuery]);

  const handleOpenAdd = () => {
    setEditingMonitor(null);
    setFormData({ name: '', url: '', method: 'GET', interval_seconds: 60, timeout_seconds: 30, expected_status_codes: '200-299', auth_type: 'none', auth_value: '', keyword: '', keyword_type: 'present', headers: [], body: '', max_retries: 3 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (monitor: any) => {
    setEditingMonitor(monitor);
    let parsedHeaders = [];
    try { parsedHeaders = JSON.parse(monitor.headers || '[]'); } catch {}
    setFormData({
      name: monitor.name, url: monitor.url, method: monitor.method,
      interval_seconds: monitor.interval_seconds, timeout_seconds: monitor.timeout_seconds,
      expected_status_codes: monitor.expected_status_codes, auth_type: monitor.auth_type,
      auth_value: monitor.auth_value || '', keyword: monitor.keyword || '',
      keyword_type: monitor.keyword_type || 'present', headers: parsedHeaders,
      body: monitor.body || '', max_retries: monitor.max_retries,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingMonitor) {
        await updateMonitor(editingMonitor.id, formData);
      } else {
        await createMonitor(formData);
      }
      await fetchMonitors();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await deleteMonitor(id);
      await fetchMonitors();
    } catch (err: any) { alert(err.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand"><Activity className="w-8 h-8" /></div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Monitors</h1>
            <p className="text-zinc-500 text-sm font-medium">{monitors.length} monitor{monitors.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={async () => { try { const data = await exportMonitors(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `monitors-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); } catch {} }} className="bg-dark-800 hover:bg-dark-700 text-zinc-300 px-5 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-dark-700">
            <svg className="w-5 h-5 inline-block mr-2 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button onClick={() => { setIsImportModalOpen(true); setImportJson(''); setImportResult(null); setImportError(''); }} className="bg-dark-800 hover:bg-dark-700 text-zinc-300 px-5 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-dark-700">
            <svg className="w-5 h-5 inline-block mr-2 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L16 8m4-4v12" /></svg>
            Import
          </button>
          <button onClick={handleOpenAdd} className="bg-brand hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95">+ New Monitor</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-dark-900 border border-dark-800 p-4 rounded-3xl shadow-xl">
        <div className="flex-1 relative">
          <input type="text" placeholder="Search monitors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-dark-950 border border-dark-800 rounded-2xl py-3 px-5 pl-12 outline-none focus:ring-1 focus:ring-brand text-sm font-medium text-white" />
          <Globe className="w-5 h-5 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {filteredMonitors.length === 0 ? (
          <div className="bg-dark-900 border border-dark-800 rounded-3xl p-16 text-center">
            <Globe className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold text-lg mb-2">No monitors yet</p>
            <p className="text-zinc-600 text-sm mb-6">Add your first monitor to start tracking uptime</p>
            <button onClick={handleOpenAdd} className="px-8 py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-xs">+ Add Monitor</button>
          </div>
        ) : (
          filteredMonitors.map((monitor: any) => (
            <div key={monitor.id} className="bg-dark-900 border border-dark-800 rounded-3xl p-6 md:p-8 hover:border-brand/40 transition-all flex flex-col lg:flex-row lg:items-center gap-6 shadow-xl group">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/sites/${monitor.id}`)}>
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border shrink-0 ${monitor.status === 'up' ? 'bg-brand/10 text-brand border-brand/20' : monitor.status === 'pending' ? 'bg-zinc-500/10 text-zinc-400 border-dark-800' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {monitor.status === 'up' ? <CheckCircle className="w-7 h-7" /> : monitor.status === 'pending' ? <Activity className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-xl text-zinc-100 group-hover:text-brand transition-colors tracking-tight truncate">{monitor.name}</h3>
                    <p className="text-zinc-500 text-sm font-mono truncate">{monitor.url}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{monitor.method}</span>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Every {monitor.interval_seconds}s</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${monitor.status === 'up' ? 'text-brand bg-brand/10' : monitor.status === 'pending' ? 'text-zinc-400 bg-zinc-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                        {monitor.status === 'up' ? 'Online' : monitor.status === 'pending' ? 'Pending' : 'Down'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => handleOpenEdit(monitor)} className="px-5 py-2.5 bg-dark-950 border border-dark-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-brand/40 transition-all">Edit</button>
                <button onClick={() => handleDelete(monitor.id)} className="px-5 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 w-full max-w-4xl rounded-[40px] p-10 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-3xl font-black mb-10 tracking-tight">{editingMonitor ? 'Edit Monitor' : 'New Monitor'}</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="My Website" />
                <Field label="URL" value={formData.url} onChange={v => setFormData({...formData, url: v})} type="url" placeholder="https://example.com" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Field label="Method" value={formData.method} onChange={v => setFormData({...formData, method: v})} select={['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'PATCH']} />
                <Field label="Interval (sec)" value={formData.interval_seconds} onChange={v => setFormData({...formData, interval_seconds: Math.max(30, Number(v))})} type="number" />
                <Field label="Timeout (sec)" value={formData.timeout_seconds} onChange={v => setFormData({...formData, timeout_seconds: Number(v)})} type="number" />
                <Field label="Status Codes" value={formData.expected_status_codes} onChange={v => setFormData({...formData, expected_status_codes: v})} placeholder="200-299" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field label="Auth Type" value={formData.auth_type} onChange={v => setFormData({...formData, auth_type: v})} select={['none', 'basic', 'bearer']} />
                {formData.auth_type !== 'none' && (
                  <div className="md:col-span-2"><Field label={formData.auth_type === 'basic' ? 'Credentials (user:pass)' : 'Token'} value={formData.auth_value} onChange={v => setFormData({...formData, auth_value: v})} /></div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field label="Keyword" value={formData.keyword} onChange={v => setFormData({...formData, keyword: v})} placeholder="Optional keyword to check" />
                <Field label="Keyword Mode" value={formData.keyword_type} onChange={v => setFormData({...formData, keyword_type: v})} select={['present', 'absent']} />
                <Field label="Max Retries" value={formData.max_retries} onChange={v => setFormData({...formData, max_retries: Number(v)})} type="number" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Custom Headers</p>
                  <button type="button" onClick={() => setFormData({...formData, headers: [...formData.headers, {key:'',value:''}]})} className="text-brand text-[10px] font-black uppercase tracking-widest">+ Add Header</button>
                </div>
                {formData.headers.map((h, i) => (
                  <div key={i} className="flex gap-4">
                    <input value={h.key} onChange={e => { const nh = [...formData.headers]; nh[i] = {...nh[i], key: e.target.value}; setFormData({...formData, headers: nh}); }} className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-brand" placeholder="Key" />
                    <input value={h.value} onChange={e => { const nh = [...formData.headers]; nh[i] = {...nh[i], value: e.target.value}; setFormData({...formData, headers: nh}); }} className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-brand" placeholder="Value" />
                    <button type="button" onClick={() => setFormData({...formData, headers: formData.headers.filter((_,j) => j !== i)})} className="text-rose-500 text-xs font-bold px-3">×</button>
                  </div>
                ))}
              </div>
              {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Request Body</label>
                  <textarea value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl p-4 text-xs font-mono text-white h-24 outline-none focus:ring-1 focus:ring-brand" />
                </div>
              )}
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-2xl bg-dark-950 border border-dark-800 text-zinc-500 font-black uppercase tracking-widest text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-5 rounded-2xl bg-brand text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : editingMonitor ? 'Update Monitor' : 'Create Monitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 w-full max-w-3xl rounded-[40px] p-10 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-3xl font-black mb-4 tracking-tight">Import Monitors</h2>
            <p className="text-zinc-500 text-sm mb-8">Paste a JSON export file or drag-and-drop a <code className="text-brand">.json</code> file below. The expected format is <code className="text-brand">{"{"} "monitors": [...] {"}"}</code></p>

            <div className="space-y-6">
              <div
                className="relative border-2 border-dashed border-dark-700 hover:border-brand/40 rounded-3xl transition-colors"
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = (ev) => setImportJson(ev.target?.result as string || '');
                    reader.readAsText(file);
                  }
                }}
              >
                <textarea
                  value={importJson}
                  onChange={e => { setImportJson(e.target.value); setImportResult(null); setImportError(''); }}
                  rows={12}
                  placeholder='{"monitors": [{"name": "My Site", "url": "https://example.com", ...}]}'
                  className="w-full bg-transparent rounded-3xl p-6 text-xs font-mono text-white outline-none resize-none"
                />
              </div>

              {/* File picker */}
              <label className="flex items-center gap-3 px-5 py-3 bg-dark-950 border border-dark-800 rounded-2xl cursor-pointer hover:border-brand/40 transition-all w-fit">
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Choose File</span>
                <input type="file" accept=".json" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setImportJson(ev.target?.result as string || '');
                    reader.readAsText(file);
                  }
                }} />
              </label>

              {importError && <p className="text-rose-400 text-sm font-bold">{importError}</p>}
              {importResult && (
                <div className="bg-brand/10 border border-brand/20 rounded-2xl p-6 space-y-2">
                  <p className="text-brand font-black text-sm">{importResult.created} monitor{importResult.created !== 1 ? 's' : ''} imported successfully</p>
                  {importResult.skipped > 0 && <p className="text-yellow-400 text-xs font-bold">{importResult.skipped} skipped</p>}
                  {importResult.errors?.length > 0 && importResult.errors.map((err: string, i: number) => (
                    <p key={i} className="text-rose-400 text-xs">{err}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="flex-1 py-5 rounded-2xl bg-dark-950 border border-dark-800 text-zinc-500 font-black uppercase tracking-widest text-xs">Cancel</button>
                <button
                  onClick={async () => {
                    setImportError(''); setImportResult(null);
                    try {
                      const parsed = JSON.parse(importJson);
                      const monitors = parsed.monitors || parsed;
                      if (!Array.isArray(monitors)) throw new Error('Expected an array of monitors');
                      const result = await importMonitors(monitors);
                      setImportResult(result);
                      if (result.created > 0) fetchMonitors();
                    } catch (e: any) {
                      setImportError(e.message || 'Invalid JSON');
                    }
                  }}
                  disabled={!importJson.trim()}
                  className="flex-1 py-5 rounded-2xl bg-brand text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", select, placeholder }: { label: string; value: any; onChange: (v: string) => void; type?: string; select?: string[]; placeholder?: string }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</label>
    {select ? (
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-brand text-sm text-white appearance-none">
        {select.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    ) : (
      <input required={label === 'Name' || label === 'URL'} type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 outline-none focus:ring-1 focus:ring-brand text-sm text-white" placeholder={placeholder} />
    )}
  </div>
);

export default AllSites;

