import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getMonitors } from '../api';
import { CheckCircle, AlertTriangle, XCircle, Globe, Activity } from '../components/Icons';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([getDashboardStats(), getMonitors()]);
      setStats(s);
      setMonitors(m);
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

  const chartData = (stats?.recentHeartbeats || [])
    .filter((h: any) => h.status === 'up')
    .slice(0, 50)
    .reverse()
    .map((h: any, idx: number) => ({
      time: idx,
      latency: h.response_time,
      name: h.monitor_name,
    }));

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monitor List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Monitors</h3>
                <p className="text-sm text-zinc-500 mt-1">{monitors.length} monitors configured</p>
              </div>
              <button onClick={() => navigate('/sites')} className="text-xs font-bold text-brand hover:underline">View All →</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {monitors.length === 0 ? (
                <div className="col-span-2 py-16 text-center">
                  <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 font-bold">No monitors configured yet</p>
                  <button onClick={() => navigate('/sites')} className="mt-4 px-6 py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest">Add Your First Monitor</button>
                </div>
              ) : (
                monitors.map((monitor: any) => (
                  <button key={monitor.id} onClick={() => navigate(`/sites/${monitor.id}`)} className="flex items-center justify-between p-5 rounded-2xl bg-dark-950 border border-dark-800 hover:border-brand/40 transition-all group shadow-sm text-left w-full">
                    <div className="min-w-0 flex-1 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${monitor.status === 'up' ? 'bg-brand shadow-[0_0_8px_rgba(2,141,134,0.4)]' : monitor.status === 'pending' ? 'bg-zinc-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]'}`}></span>
                        <p className="text-base font-bold truncate group-hover:text-brand transition-colors">{monitor.name}</p>
                      </div>
                      <p className="text-xs text-zinc-500 truncate font-mono">{monitor.url}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${monitor.status === 'up' ? 'bg-brand/10 text-brand' : monitor.status === 'pending' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {monitor.status === 'up' ? 'Online' : monitor.status === 'pending' ? 'Pending' : 'Down'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-8">
          {/* Response Time Chart */}
          {chartData.length > 0 && (
            <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold">Response Time</h3>
                <p className="text-xs text-zinc-500 mt-1">Recent checks (ms)</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e1e" />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid #2d2d2d', borderRadius: '12px' }} itemStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="latency" stroke="#028D86" strokeWidth={2} fill="#028D86" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Active Incidents */}
          <div className={`${stats?.activeIncidents > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-brand'} rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden`}>
            {stats?.activeIncidents > 0 ? (
              <>
                <h4 className="text-lg font-black uppercase tracking-tight mb-2 text-rose-400">
                  <AlertTriangle className="w-5 h-5 inline mr-2" />
                  {stats.activeIncidents} Active Incident{stats.activeIncidents > 1 ? 's' : ''}
                </h4>
                <p className="text-zinc-400 text-xs mb-6 leading-relaxed">There are unresolved incidents that may affect services.</p>
                <button onClick={() => navigate('/public-management')} className="w-full py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Manage Incidents</button>
              </>
            ) : (
              <>
                <h4 className="text-lg font-black uppercase tracking-tight mb-2">All Systems Operational</h4>
                <p className="text-white/70 text-xs mb-6 leading-relaxed">No active incidents. All monitors are running smoothly.</p>
                <button onClick={() => navigate('/settings')} className="w-full py-3 bg-white text-brand rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Configure Notifications</button>
              </>
            )}
          </div>
        </div>
      </div>
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

