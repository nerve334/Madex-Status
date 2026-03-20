import React, { useState, useEffect, useCallback } from 'react';
import { getPublicStatus } from '../api';
import { CheckCircle, Activity, Shield, Globe } from '../components/Icons';
import InteractiveBackground from '../components/InteractiveBackground';

type StatusType = 'operational' | 'degraded' | 'partial' | 'major' | 'maintenance';

const getStatusLabel = (status: StatusType) => {
  const labels: Record<string, string> = { operational: 'Operational', degraded: 'Degraded Performance', partial: 'Partial Outage', major: 'Major Outage', maintenance: 'Under Maintenance' };
  return labels[status] || status;
};

const getStatusColor = (status: StatusType) => {
  const colors: Record<string, string> = { operational: 'text-brand', degraded: 'text-yellow-400', partial: 'text-orange-500', major: 'text-rose-500', maintenance: 'text-indigo-400' };
  return colors[status] || 'text-zinc-500';
};

const getStatusDot = (status: string) => {
  if (status === 'operational' || status === 'up') return 'bg-brand';
  if (status === 'maintenance') return 'bg-indigo-500';
  if (status === 'degraded') return 'bg-yellow-400';
  return 'bg-rose-500';
};

const getHeartbeatColor = (status: string) => {
  if (status === 'up' || status === 'operational') return 'bg-brand hover:bg-brand/80';
  if (status === 'degraded') return 'bg-yellow-400 hover:bg-yellow-300';
  if (status === 'pending') return 'bg-zinc-600 hover:bg-zinc-500';
  return 'bg-rose-500 hover:bg-rose-400';
};

const formatTime = (ts: string) => {
  const d = new Date(ts + 'Z');
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const PublicStatus: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getPublicStatus();
      setData(result);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(timer); };
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) return null;

  const { systems, incidents, providerIncidents, monitors, settings } = data;
  const brandName = settings.brand_name || 'Madex Status';
  const activeIncidents = incidents.filter((i: any) => i.status === 'active');
  const resolvedIncidents = incidents.filter((i: any) => i.status === 'resolved');
  const allProviderIncidents = providerIncidents || [];
  const hasActiveIssues = activeIncidents.length > 0 || allProviderIncidents.length > 0;
  const allSystemsOk = systems.every((s: any) => s.status === 'operational') && !hasActiveIssues;

  return (
    <div className="min-h-screen bg-dark-950 px-4 md:px-12 py-8 md:py-16 selection:bg-brand selection:text-white relative overflow-hidden">
      <InteractiveBackground />

      <div className="max-w-[1600px] mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 pointer-events-none">
        
        {/* Header */}
        <header className="flex flex-col items-center gap-8 border-b border-dark-800 pb-12 text-center pointer-events-none">
          <div className="w-24 h-24 bg-dark-900/80 backdrop-blur-sm border border-dark-800 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(2,141,134,0.15)] group transition-all duration-500 hover:border-brand/40 cursor-pointer overflow-hidden pointer-events-auto">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="relative">
                <Activity className="w-12 h-12 text-brand group-hover:scale-110 transition-transform duration-500" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"></span>
                </span>
              </div>
            )}
          </div>
          <div className="pointer-events-auto">
            <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-white uppercase flex flex-row items-center justify-center gap-x-3 md:gap-x-4 w-full text-center whitespace-nowrap">
              <span>{brandName.split(' ')[0]}</span>
              <span className="text-brand">{brandName.split(' ').slice(1).join(' ') || 'Status'}</span>
            </h1>
            <p className="text-sm text-zinc-500 font-mono uppercase tracking-[0.4em] mt-4 flex items-center justify-center gap-3">
              <span className="w-8 h-px bg-dark-800"></span>
              {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              <span className="w-8 h-px bg-dark-800"></span>
            </p>
          </div>

          {/* Overall Status Banner */}
          <div className={`pointer-events-auto px-8 py-4 rounded-2xl border ${allSystemsOk ? 'bg-brand/10 border-brand/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${allSystemsOk ? 'bg-brand' : 'bg-rose-500'} animate-pulse`}></span>
              <span className={`text-sm font-black uppercase tracking-widest ${allSystemsOk ? 'text-brand' : 'text-rose-400'}`}>
                {allSystemsOk ? 'All Systems Operational' : 'Some Systems Are Experiencing Issues'}
              </span>
            </div>
          </div>
        </header>

        {/* Core Systems */}
        {systems.length > 0 && (
          <section className="space-y-10 pointer-events-none">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600 flex items-center gap-3"><Shield className="w-4 h-4 text-brand" /> Core Infrastructure</h2>
              <div className="h-px bg-dark-800 flex-1"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {systems.map((system: any) => {
                const hbs = system.heartbeats || [];
                return (
                <div key={system.id} className="bg-dark-900/60 backdrop-blur-sm border border-dark-800 rounded-[32px] p-8 hover:border-brand/30 transition-all duration-500 shadow-2xl pointer-events-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-2xl text-zinc-100 tracking-tight">{system.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${getStatusDot(system.status)} animate-pulse`}></div>
                  </div>

                  {/* Heartbeat bar */}
                  <div className="flex items-end gap-[2px] h-[24px]">
                    {(() => {
                      const maxBars = 20;
                      const padded = [
                        ...Array.from({ length: Math.max(0, maxBars - hbs.length) }).map(() => ({ status: 'empty', response_time: 0, timestamp: '' })),
                        ...hbs,
                      ].slice(-maxBars);
                      return padded.map((hb: any, i: number) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-[2px] cursor-default transition-all duration-150 ${
                            hb.status === 'empty' ? 'bg-zinc-800/40' : getHeartbeatColor(hb.status)
                          }`}
                          style={{ height: '100%' }}
                          title={hb.status !== 'empty' ? `${formatTime(hb.timestamp)} — ${hb.status === 'up' ? 'Up' : hb.status === 'down' ? 'Down' : hb.status}${hb.response_time ? ` (${hb.response_time}ms)` : ''}` : ''}
                        />
                      ));
                    })()}
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Active Incidents (manual + provider) */}
        {(activeIncidents.length > 0 || allProviderIncidents.length > 0) && (
          <section className="space-y-10 pointer-events-none">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-rose-400 flex items-center gap-3"><Activity className="w-4 h-4 text-rose-400" /> Active Incidents</h2>
              <div className="h-px bg-dark-800 flex-1"></div>
            </div>
            <div className="space-y-6">
              {activeIncidents.map((incident: any) => (
                <div key={incident.id} className="bg-rose-500/5 border border-rose-500/20 rounded-[32px] p-8 pointer-events-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-orange-500 text-[9px] font-black uppercase tracking-widest animate-pulse px-3 py-1 rounded-lg border border-orange-500/20">Active</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${getStatusColor(incident.impact_status)}`}>{getStatusLabel(incident.impact_status)}</span>
                  </div>
                  <h4 className="text-xl font-black tracking-tight text-zinc-100 mb-2">{incident.title}</h4>
                  {incident.description && <p className="text-sm text-zinc-400 leading-relaxed mb-4">{incident.description}</p>}
                  <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-mono">
                    <span>{new Date(incident.created_at).toLocaleString()}</span>
                    {incident.system_name && <span className="text-brand">• {incident.system_name}</span>}
                  </div>
                </div>
              ))}
              {allProviderIncidents.map((inc: any) => (
                <div key={inc.id} className="bg-amber-500/5 border border-amber-500/20 rounded-[32px] p-6 md:p-8 pointer-events-auto">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-amber-400 text-[9px] font-black uppercase tracking-widest animate-pulse px-3 py-1 rounded-lg border border-amber-400/20">{inc.status}</span>
                    <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-zinc-700">{inc.provider}</span>
                    {inc.components && <span className="text-zinc-400 text-[9px] font-mono">{inc.components}</span>}
                  </div>
                  <h4 className="text-lg md:text-xl font-black tracking-tight text-zinc-100 mb-2">{inc.title}</h4>
                  {inc.description && <p className="text-sm text-zinc-400 leading-relaxed mb-4">{inc.description}</p>}
                  <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-mono">
                    <span>{new Date(inc.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Monitored Websites */}
        {monitors.length > 0 && (
          <section className="space-y-10 pointer-events-none">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600 flex items-center gap-3"><Globe className="w-4 h-4 text-brand" /> Monitored Services</h2>
              <div className="h-px bg-dark-800 flex-1"></div>
            </div>
            <div className="space-y-6">
              {monitors.map((monitor: any) => {
                const mhbs = monitor.heartbeats || [];
                return (
                <div key={monitor.id} className="bg-dark-900/60 backdrop-blur-sm border border-dark-800 rounded-[32px] p-8 hover:border-brand/30 transition-all duration-500 shadow-xl pointer-events-auto">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-2xl border border-white/5 ${monitor.status === 'up' ? 'bg-brand/10 text-brand' : 'bg-rose-500/10 text-rose-500'}`}>
                          <Globe className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-xl text-zinc-100 tracking-tight">{monitor.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            {monitor.responseTime > 0 && (
                              <span className="text-xs text-zinc-500 font-mono">{monitor.responseTime}ms</span>
                            )}
                            <span className="text-xs text-zinc-600 font-mono">{monitor.uptime}% uptime</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full ${monitor.status === 'up' ? 'bg-brand' : 'bg-rose-500'} animate-pulse`}></div>
                    </div>
                    {/* Heartbeat bar */}
                    <div className="flex items-end gap-[2px] h-[24px]">
                      {(() => {
                        const maxBars = 20;
                        const padded = [
                          ...Array.from({ length: Math.max(0, maxBars - mhbs.length) }).map(() => ({ status: 'empty', response_time: 0, timestamp: '' })),
                          ...mhbs,
                        ].slice(-maxBars);
                        return padded.map((hb: any, i: number) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-[2px] cursor-default transition-all duration-150 ${
                              hb.status === 'empty' ? 'bg-zinc-800/40' : getHeartbeatColor(hb.status)
                            }`}
                            style={{ height: '100%' }}
                            title={hb.status !== 'empty' ? `${formatTime(hb.timestamp)} — ${hb.status === 'up' ? 'Up' : 'Down'}${hb.response_time ? ` (${hb.response_time}ms)` : ''}` : ''}
                          />
                        ));
                      })()}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Incident History */}
        {resolvedIncidents.length > 0 && (
          <section className="space-y-10 pointer-events-none">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600 flex items-center gap-3"><Activity className="w-4 h-4 text-brand" /> Incident History</h2>
              <div className="h-px bg-dark-800 flex-1"></div>
            </div>
            <div className="bg-dark-900/60 backdrop-blur-sm border border-dark-800 rounded-[48px] p-10 md:p-16 shadow-2xl pointer-events-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {resolvedIncidents.slice(0, 9).map((incident: any) => (
                  <div key={incident.id} className="flex flex-col gap-4 p-6 bg-dark-950/60 border border-dark-800 rounded-[24px] hover:border-brand/20 transition-all">
                    <p className="text-zinc-600 text-[10px] font-black font-mono uppercase tracking-widest">{new Date(incident.created_at).toLocaleDateString()}</p>
                    <div className="flex flex-wrap gap-2">
                      {incident.system_name && <span className="text-brand text-[9px] font-black uppercase tracking-widest bg-brand/10 px-3 py-1 rounded-lg border border-brand/20">{incident.system_name}</span>}
                      <span className={`${getStatusColor(incident.impact_status)} text-[9px] font-black uppercase tracking-widest bg-dark-900 px-3 py-1 rounded-lg border border-white/5`}>{getStatusLabel(incident.impact_status)}</span>
                    </div>
                    <h4 className="text-lg font-black tracking-tight text-zinc-100">{incident.title}</h4>
                    {incident.description && <p className="text-sm text-zinc-400 line-clamp-3">{incident.description}</p>}
                    <div className="mt-auto pt-4 border-t border-dark-800">
                      <div className="text-brand text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Resolved</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* No Incidents at all */}
        {incidents.length === 0 && allProviderIncidents.length === 0 && (
          <section className="pointer-events-none">
            <div className="bg-dark-900/60 backdrop-blur-sm border border-dark-800 rounded-[48px] p-16 text-center pointer-events-auto">
              <CheckCircle className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No incidents recorded</p>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-32 pb-16 text-center border-t border-dark-800 pointer-events-none">
          <div className="flex flex-col items-center gap-10">
            <div className="flex items-center gap-5 grayscale hover:grayscale-0 transition-all duration-700 cursor-default group pointer-events-auto">
              {settings.icon ? <img src={settings.icon} className="w-10 h-10 object-contain" alt="Icon" /> : <Activity className="w-10 h-10 text-brand" />}
              <span className="font-black text-xl md:text-2xl uppercase tracking-[0.2em] md:tracking-[0.4em] text-zinc-400 group-hover:text-brand transition-colors whitespace-nowrap">{brandName}</span>
            </div>
            <p className="text-[10px] md:text-xs text-zinc-600 font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase pointer-events-auto whitespace-nowrap">&copy; 2026 {brandName} &bull; All Rights Reserved</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PublicStatus;

