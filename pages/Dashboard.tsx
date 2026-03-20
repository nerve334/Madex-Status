import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getMonitors, getIncidents } from '../api';
import { CheckCircle, AlertTriangle, XCircle, Globe, Activity } from '../components/Icons';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [s, m, inc] = await Promise.all([getDashboardStats(), getMonitors(), getIncidents()]);
      setStats(s);
      setMonitors(m);
      setIncidents(inc);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i: any) => i.status === 'active');
  const resolvedIncidents = incidents.filter((i: any) => i.status === 'resolved');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-1">Real-time infrastructure health and performance.</p>
        </div>
        <div className="flex items-center gap-3 bg-dark-900/50 border border-dark-800 px-5 py-2.5 rounded-2xl text-[10px] font-black text-brand shadow-lg uppercase tracking-widest">
           <span className="relative flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
           </span>
           Live Monitoring Active
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Monitors" value={stats?.totalMonitors || 0} icon={<Globe className="w-6 h-6 text-brand" />} color="brand" />
        <StatCard title="Operational" value={stats?.upMonitors || 0} icon={<CheckCircle className="w-6 h-6 text-brand" />} color="brand" />
        <StatCard title="Down" value={stats?.downMonitors || 0} icon={<XCircle className="w-6 h-6 text-rose-500" />} color="rose" />
        <StatCard title="Avg Response" value={`${stats?.avgResponseTime || 0}ms`} icon={<Activity className="w-6 h-6 text-amber-500" />} color="amber" />
      </div>

      {/* Monitors Table */}
      {monitors.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black tracking-tight">Monitors</h3>
            <button onClick={() => navigate('/sites')} className="text-xs font-bold text-brand hover:underline">View All →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider">Status</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider">Name</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider hidden md:table-cell">URL</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider text-right">Interval</th>
                </tr>
              </thead>
              <tbody>
                {monitors.map((monitor: any) => (
                  <tr key={monitor.id} onClick={() => navigate(`/sites/${monitor.id}`)} className="border-b border-dark-800/50 hover:bg-dark-800/30 cursor-pointer transition-colors">
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        monitor.status === 'up' ? 'bg-brand/10 text-brand' : monitor.status === 'pending' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${monitor.status === 'up' ? 'bg-brand' : monitor.status === 'pending' ? 'bg-zinc-500' : 'bg-rose-500'}`}></span>
                        {monitor.status === 'up' ? 'Online' : monitor.status === 'pending' ? 'Pending' : 'Down'}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-bold text-zinc-100">{monitor.name}</span>
                    </td>
                    <td className="py-4 pr-4 hidden md:table-cell">
                      <span className="text-xs text-zinc-500 font-mono truncate max-w-[300px] block">{monitor.url}</span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="text-xs text-zinc-500 font-mono">{monitor.interval_seconds}s</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Incidents */}
      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black tracking-tight">
            {activeIncidents.length > 0 ? (
              <span className="flex items-center gap-2 text-rose-400"><AlertTriangle className="w-5 h-5" /> Active Incidents ({activeIncidents.length})</span>
            ) : (
              <span className="flex items-center gap-2 text-brand"><CheckCircle className="w-5 h-5" /> No Active Incidents</span>
            )}
          </h3>
          <button onClick={() => navigate('/public-management')} className="text-xs font-bold text-brand hover:underline">Manage →</button>
        </div>
        {activeIncidents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider">Impact</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider">Title</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider hidden md:table-cell">System</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {activeIncidents.map((inc: any) => (
                  <tr key={inc.id} className="border-b border-dark-800/50">
                    <td className="py-4 pr-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        inc.impact_status === 'major' ? 'bg-rose-500/10 text-rose-400'
                        : inc.impact_status === 'degraded' ? 'bg-yellow-400/10 text-yellow-400'
                        : inc.impact_status === 'maintenance' ? 'bg-indigo-500/10 text-indigo-400'
                        : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {inc.impact_status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-bold text-zinc-100">{inc.title}</td>
                    <td className="py-4 pr-4 hidden md:table-cell text-xs text-zinc-500">{inc.system_name || '—'}</td>
                    <td className="py-4 text-right text-xs text-zinc-500 font-mono">{new Date(inc.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">All systems are running smoothly. No active incidents.</p>
        )}
      </div>

      {/* Recent Resolved Incidents */}
      {resolvedIncidents.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-black tracking-tight mb-6">Recent Resolved Incidents</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider">Impact</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider">Title</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider hidden md:table-cell">System</th>
                  <th className="pb-3 text-[10px] text-zinc-500 font-black uppercase tracking-wider text-right">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {resolvedIncidents.slice(0, 10).map((inc: any) => (
                  <tr key={inc.id} className="border-b border-dark-800/50">
                    <td className="py-4 pr-4">
                      <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand/10 text-brand">
                        {inc.impact_status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-bold text-zinc-100">{inc.title}</td>
                    <td className="py-4 pr-4 hidden md:table-cell text-xs text-zinc-500">{inc.system_name || '—'}</td>
                    <td className="py-4 text-right text-xs text-zinc-500 font-mono">{inc.resolved_at ? new Date(inc.resolved_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) => {
  const colorMap: Record<string, string> = {
    brand: 'bg-brand/5 hover:border-brand/50',
    rose: 'bg-rose-500/5 hover:border-rose-500/50',
    amber: 'bg-amber-500/5 hover:border-amber-500/50',
  };
  return (
    <div className={`text-left w-full border border-dark-800 rounded-3xl p-6 shadow-xl flex items-center justify-between group transition-all duration-300 ${colorMap[color] || colorMap.brand}`}>
      <div>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">{title}</p>
        <p className="text-4xl font-black mt-2 tracking-tighter">{value}</p>
      </div>
      <div className="p-4 rounded-2xl bg-dark-950 group-hover:scale-110 transition-transform shadow-inner">{icon}</div>
    </div>
  );
};

export default Dashboard;

