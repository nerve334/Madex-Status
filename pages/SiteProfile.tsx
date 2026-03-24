import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMonitor, deleteMonitor, getUptime } from '../api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle, AlertTriangle, XCircle, Globe, Activity } from '../components/Icons';

const SiteProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<any>(null);
  const [heartbeats, setHeartbeats] = useState<any[]>([]);
  const [uptime, setUptime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [monitorData, uptimeData] = await Promise.all([
        getMonitor(Number(id)),
        getUptime(Number(id), 24),
      ]);
      setMonitor(monitorData.monitor);
      setHeartbeats(monitorData.heartbeats);
      setUptime(uptimeData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!monitor) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 bg-dark-950 rounded-[40px] border border-dark-800">
        <Globe className="w-16 h-16 text-zinc-700 mb-6" />
        <h2 className="text-2xl font-black text-white">Monitor Not Found</h2>
        <button onClick={() => navigate('/sites')} className="mt-8 px-8 py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl">Return to List</button>
      </div>
    );
  }

  const recentHB = [...heartbeats].reverse();
  const chartData = recentHB.filter(h => h.status === 'up').map((h, idx) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: h.response_time,
  }));

  const avgLatency = heartbeats.length > 0 ? Math.round(heartbeats.filter(h => h.status === 'up').reduce((a, b) => a + b.response_time, 0) / Math.max(1, heartbeats.filter(h => h.status === 'up').length)) : 0;
  const maxLatency = heartbeats.length > 0 ? Math.max(...heartbeats.map(h => h.response_time)) : 0;
  const latestRT = heartbeats[0]?.response_time || 0;

  const confirmDelete = async () => {
    await deleteMonitor(Number(id));
    navigate('/sites');
  };

  // Build status bar from heartbeats
  const statusBar = recentHB.slice(-30).map(h => h.status);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-dark-900 border border-dark-800 p-8 md:p-12 rounded-[40px] shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand opacity-[0.03] blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-start gap-6 flex-1 min-w-0">
          <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center shrink-0 shadow-inner border ${monitor.status === 'up' ? 'bg-brand/10 text-brand border-brand/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
            {monitor.status === 'up' ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white truncate">{monitor.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="text-brand font-mono text-sm hover:underline flex items-center gap-2">
                {monitor.url}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${monitor.status === 'up' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {monitor.status === 'up' ? 'Online' : monitor.status === 'pending' ? 'Pending' : 'Down'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 shrink-0">
          <button onClick={() => setIsDeleteModalOpen(true)} className="px-6 py-4 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Remove</button>
          <button onClick={() => navigate('/sites')} className="px-6 py-4 bg-dark-950 hover:bg-dark-800 text-zinc-400 hover:text-white border border-dark-800 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Back</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
          <div className="bg-dark-900 border border-dark-800 rounded-[40px] p-8 md:p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Performance Trend</h3>
                <p className="text-sm text-zinc-500 mt-1">Response time analysis</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Average</p>
                  <p className="text-xl font-black text-brand">{avgLatency}ms</p>
                </div>
                <div className="text-right border-l border-dark-800 pl-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Current</p>
                  <p className="text-xl font-black text-white">{latestRT}ms</p>
                </div>
                <div className="text-right border-l border-dark-800 pl-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Max</p>
                  <p className="text-xl font-black text-white">{maxLatency}ms</p>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="profileRT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#028D86" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#028D86" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e1e" />
                  <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}ms`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '20px', padding: '12px 16px' }} itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#028D86' }} />
                  <Area type="monotone" dataKey="latency" stroke="#028D86" strokeWidth={3} fillOpacity={1} fill="url(#profileRT)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-dark-900 border border-dark-800 rounded-[40px] p-8 md:p-10 shadow-2xl">
            <h3 className="text-2xl font-black tracking-tight mb-8">Recent Checks</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {heartbeats.slice(0, 20).map((hb, i) => (
                <div key={hb.id || i} className="flex items-center gap-4 p-4 bg-dark-950 border border-dark-800 rounded-2xl">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hb.status === 'up' ? 'bg-brand' : hb.status === 'retry' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${hb.status === 'up' ? 'text-brand' : hb.status === 'retry' ? 'text-amber-500' : 'text-rose-500'}`}>
                        {hb.status === 'up' ? 'UP' : hb.status === 'retry' ? 'RETRY' : 'DOWN'}
                      </span>
                      {hb.status_code > 0 && <span className="text-[10px] font-mono text-zinc-600">HTTP {hb.status_code}</span>}
                      {hb.response_time > 0 && <span className="text-[10px] font-mono text-zinc-600">{hb.response_time}ms</span>}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{hb.message}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono shrink-0">{new Date(hb.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Uptime Card */}
          <div className="bg-dark-900 border border-dark-800 rounded-[40px] p-8 shadow-2xl">
            <h3 className="text-xl font-black tracking-tight mb-6">Uptime (24h)</h3>
            <div className="text-center py-4">
              <p className={`text-5xl font-black tracking-tighter ${(uptime?.percentage || 0) >= 99 ? 'text-brand' : (uptime?.percentage || 0) >= 95 ? 'text-amber-400' : 'text-rose-500'}`}>
                {uptime?.percentage || 100}%
              </p>
              <p className="text-xs text-zinc-500 mt-2">{uptime?.up || 0} / {uptime?.total || 0} checks passed</p>
            </div>
            {/* Mini status bar */}
            <div className="flex items-end gap-[2px] h-8 mt-6">
              {statusBar.map((s, i) => (
                <div key={i} className={`flex-1 h-full rounded-[2px] ${s === 'up' ? 'bg-brand' : s === 'retry' ? 'bg-amber-500' : 'bg-rose-500'} hover:brightness-125 transition-all`} />
              ))}
            </div>
          </div>

          {/* Monitor Config */}
          <div className="bg-dark-900 border border-dark-800 rounded-[40px] p-8 shadow-2xl">
            <h3 className="text-xl font-black tracking-tight mb-8">Configuration</h3>
            <div className="space-y-5">
              <SpecItem label="Monitor ID" value={String(monitor.id)} mono />
              <SpecItem label="Check Interval" value={`Every ${monitor.interval_seconds}s`} />
              <SpecItem label="Method" value={monitor.method} />
              <SpecItem label="Expected Status" value={monitor.expected_status_codes} />
              <SpecItem label="Timeout" value={`${monitor.timeout_seconds}s`} />
              <SpecItem label="Keyword" value={monitor.keyword || 'None'} />
              <SpecItem label="Max Retries" value={String(monitor.max_retries)} />
              <SpecItem label="Created" value={new Date(monitor.created_at).toLocaleDateString()} />
            </div>
          </div>

          {/* Alert Card */}
          <div className="bg-brand rounded-[40px] p-8 shadow-2xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="p-3 bg-white/20 w-fit rounded-2xl mb-6"><AlertTriangle className="w-6 h-6 text-white" /></div>
              <h4 className="text-xl font-black tracking-tight">Notifications</h4>
              <p className="text-sm text-white/70 mt-2 mb-8 leading-relaxed">Configure Discord webhooks to receive alerts when this monitor goes down.</p>
              <button onClick={() => navigate('/settings')} className="w-full py-4 bg-white text-brand font-black uppercase tracking-widest rounded-2xl text-xs shadow-xl hover:scale-105 active:scale-95 transition-all">Configure Alerts</button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-dark-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10" /></div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">Delete Monitor</h2>
            <p className="text-zinc-500 text-sm mb-8">Are you sure you want to delete <span className="text-white font-bold">{monitor.name}</span>? All heartbeat data will be lost.</p>
            <div className="flex gap-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-dark-800 text-zinc-500 font-black uppercase tracking-widest hover:bg-dark-800 hover:text-white transition-all text-[10px]">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl text-[10px]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SpecItem = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
    <span className={`text-sm font-bold text-zinc-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

export default SiteProfile;

