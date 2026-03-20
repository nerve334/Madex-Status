import React, { useState, useEffect, useCallback } from 'react';
import { getPublicSystems, updatePublicSystem, createPublicSystem, deletePublicSystem, getIncidents, createIncident, updateIncident, deleteIncident } from '../api';
import { Activity, CheckCircle, AlertTriangle } from '../components/Icons';

const statusOptions = ['operational', 'degraded', 'partial', 'major', 'maintenance'] as const;

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { operational: 'Operational', degraded: 'Degraded', partial: 'Partial Outage', major: 'Major Outage', maintenance: 'Maintenance' };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = { operational: 'text-brand', degraded: 'text-yellow-400', partial: 'text-orange-500', major: 'text-rose-500', maintenance: 'text-indigo-400' };
  return colors[status] || 'text-zinc-500';
};

const PublicManagement: React.FC = () => {
  const [systems, setSystems] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSystemForm, setShowSystemForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [newSystem, setNewSystem] = useState({ name: '', status: 'operational' });
  const [editingProvider, setEditingProvider] = useState<number | null>(null);
  const [providerForm, setProviderForm] = useState({ provider_url: '', provider_component: '' });
  const [editingCheckUrl, setEditingCheckUrl] = useState<number | null>(null);
  const [checkUrlForm, setCheckUrlForm] = useState({ check_url: '', check_interval: 60 });
  const [newIncident, setNewIncident] = useState({ title: '', description: '', system_id: '', impact_status: 'major' });

  const fetchData = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([getPublicSystems(), getIncidents()]);
      setSystems(s);
      setIncidents(i);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPublicSystem(newSystem);
    setNewSystem({ name: '', status: 'operational' });
    setShowSystemForm(false);
    await fetchData();
  };

  const handleUpdateSystemStatus = async (id: number, status: string) => {
    await updatePublicSystem(id, { status });
    await fetchData();
  };

  const handleDeleteSystem = async (id: number) => {
    if (!confirm('Delete this public system?')) return;
    await deletePublicSystem(id);
    await fetchData();
  };

  const handleToggleAutoStatus = async (system: any) => {
    await updatePublicSystem(system.id, { auto_status: system.auto_status ? 0 : 1 });
    await fetchData();
  };

  const handleSaveProvider = async (id: number) => {
    await updatePublicSystem(id, {
      auto_status: 1,
      provider_url: providerForm.provider_url,
      provider_component: providerForm.provider_component,
    });
    setEditingProvider(null);
    await fetchData();
  };

  const handleSaveCheckUrl = async (id: number) => {
    await updatePublicSystem(id, {
      check_url: checkUrlForm.check_url,
      check_interval: checkUrlForm.check_interval,
    });
    setEditingCheckUrl(null);
    await fetchData();
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    await createIncident({
      ...newIncident,
      system_id: newIncident.system_id ? Number(newIncident.system_id) : null,
    });
    setNewIncident({ title: '', description: '', system_id: '', impact_status: 'major' });
    setShowIncidentForm(false);
    await fetchData();
  };

  const handleResolveIncident = async (id: number) => {
    await updateIncident(id, { status: 'resolved' });
    await fetchData();
  };

  const handleDeleteIncident = async (id: number) => {
    if (!confirm('Delete this incident permanently?')) return;
    await deleteIncident(id);
    await fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Public Status Management</h1>
        <p className="text-zinc-500 mt-1">Manage public systems and incidents displayed on the status page.</p>
      </div>

      {/* Public Systems */}
      <section className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold">Public Systems</h2>
          <button onClick={() => setShowSystemForm(!showSystemForm)} className="text-brand text-[10px] font-black uppercase tracking-widest">{showSystemForm ? 'Cancel' : '+ Add System'}</button>
        </div>

        {showSystemForm && (
          <form onSubmit={handleAddSystem} className="flex gap-4 mb-6 bg-dark-950 border border-dark-800 rounded-2xl p-4">
            <input required type="text" value={newSystem.name} onChange={e => setNewSystem({...newSystem, name: e.target.value})} className="flex-1 bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-brand" placeholder="System name" />
            <select value={newSystem.status} onChange={e => setNewSystem({...newSystem, status: e.target.value})} className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none">
              {statusOptions.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>
            <button type="submit" className="px-6 py-3 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Add</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {systems.map((system: any) => (
            <div key={system.id} className="p-6 bg-dark-950 border border-dark-800 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-base text-zinc-100">{system.name}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${system.status === 'operational' ? 'bg-brand' : system.status === 'maintenance' ? 'bg-indigo-500' : 'bg-rose-500'} animate-pulse`}></div>
                </div>
              </div>

              {/* Auto-sync toggle */}
              <div className="flex items-center justify-between bg-dark-900 rounded-xl px-4 py-3 border border-dark-800">
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 ${system.auto_status ? 'text-brand' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Auto-sync</span>
                </div>
                <button onClick={() => handleToggleAutoStatus(system)} className={`w-10 h-6 rounded-full transition-all relative ${system.auto_status ? 'bg-brand' : 'bg-dark-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${system.auto_status ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Provider config (shown when auto-sync is on) */}
              {system.auto_status ? (
                <div className="space-y-2">
                  {system.provider_url ? (
                    <div className="bg-dark-900 rounded-xl px-4 py-3 border border-brand/10 space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-brand">Provider Linked</p>
                      <p className="text-zinc-400 text-xs font-mono truncate">{system.provider_url.replace('/api/v2/components.json', '')}</p>
                      <p className="text-zinc-300 text-xs">Component: <span className="text-brand font-bold">{system.provider_component}</span></p>
                      <button onClick={() => { setEditingProvider(system.id); setProviderForm({ provider_url: system.provider_url, provider_component: system.provider_component }); }} className="text-zinc-500 hover:text-zinc-300 text-[9px] font-black uppercase tracking-widest mt-1">Edit</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingProvider(system.id); setProviderForm({ provider_url: '', provider_component: '' }); }} className="w-full bg-dark-900 border border-dashed border-dark-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:border-brand/40 hover:text-brand transition-all">
                      + Configure Provider
                    </button>
                  )}

                  {editingProvider === system.id && (
                    <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 space-y-3">
                      <div>
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Statuspage API URL</label>
                        <input value={providerForm.provider_url} onChange={e => setProviderForm({...providerForm, provider_url: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-brand font-mono" placeholder="https://status.example.com/api/v2/components.json" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Component Name (to match)</label>
                        <input value={providerForm.provider_component} onChange={e => setProviderForm({...providerForm, provider_component: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-brand" placeholder="e.g. Domains, Web Hosting, VPS" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingProvider(null)} className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-dark-950 rounded-lg border border-dark-800">Cancel</button>
                        <button onClick={() => handleSaveProvider(system.id)} disabled={!providerForm.provider_url || !providerForm.provider_component} className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest text-white bg-brand rounded-lg disabled:opacity-50">Save</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <select value={system.status} onChange={e => handleUpdateSystemStatus(system.id, e.target.value)} className={`bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none appearance-none ${getStatusColor(system.status)}`}>
                  {statusOptions.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                </select>
              )}

              <button onClick={() => handleDeleteSystem(system.id)} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 px-3 py-2 rounded-xl transition-all">Delete</button>

              {/* Health Check URL */}
              <div className="space-y-2 border-t border-dark-800 pt-4">
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 ${system.check_url ? 'text-brand' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Health Check</span>
                </div>
                {system.check_url ? (
                  <div className="bg-dark-900 rounded-xl px-4 py-3 border border-brand/10 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand">Active — Every {system.check_interval || 60}s</p>
                    <p className="text-zinc-400 text-xs font-mono truncate">{system.check_url}</p>
                    <button onClick={() => { setEditingCheckUrl(system.id); setCheckUrlForm({ check_url: system.check_url, check_interval: system.check_interval || 60 }); }} className="text-zinc-500 hover:text-zinc-300 text-[9px] font-black uppercase tracking-widest mt-1">Edit</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingCheckUrl(system.id); setCheckUrlForm({ check_url: '', check_interval: 60 }); }} className="w-full bg-dark-900 border border-dashed border-dark-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:border-brand/40 hover:text-brand transition-all">
                    + Configure Health Check URL
                  </button>
                )}

                {editingCheckUrl === system.id && (
                  <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">URL to Check</label>
                      <input value={checkUrlForm.check_url} onChange={e => setCheckUrlForm({...checkUrlForm, check_url: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-brand font-mono" placeholder="https://example.com" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Check Interval (seconds)</label>
                      <input type="number" min={30} value={checkUrlForm.check_interval} onChange={e => setCheckUrlForm({...checkUrlForm, check_interval: Math.max(30, Number(e.target.value))})} className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-brand font-mono" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCheckUrl(null)} className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-dark-950 rounded-lg border border-dark-800">Cancel</button>
                      <button onClick={() => handleSaveCheckUrl(system.id)} className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest text-white bg-brand rounded-lg">Save</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Incidents */}
      <section className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Incidents</h2>
            <p className="text-zinc-500 text-sm mt-1">Create and manage incidents</p>
          </div>
          <button onClick={() => setShowIncidentForm(!showIncidentForm)} className="text-brand text-[10px] font-black uppercase tracking-widest">{showIncidentForm ? 'Cancel' : '+ New Incident'}</button>
        </div>

        {showIncidentForm && (
          <form onSubmit={handleAddIncident} className="space-y-4 bg-dark-950 border border-dark-800 rounded-2xl p-6 mb-6">
            <input required type="text" value={newIncident.title} onChange={e => setNewIncident({...newIncident, title: e.target.value})} className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-brand" placeholder="Incident title" />
            <textarea value={newIncident.description} onChange={e => setNewIncident({...newIncident, description: e.target.value})} className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-brand h-20" placeholder="Description..." />
            <div className="grid grid-cols-2 gap-4">
              <select value={newIncident.system_id} onChange={e => setNewIncident({...newIncident, system_id: e.target.value})} className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none">
                <option value="">No system</option>
                {systems.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={newIncident.impact_status} onChange={e => setNewIncident({...newIncident, impact_status: e.target.value})} className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none">
                {statusOptions.filter(s => s !== 'operational').map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Create Incident</button>
          </form>
        )}

        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="p-16 border border-dashed border-dark-800 rounded-3xl text-center">
              <CheckCircle className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-600 font-bold">No incidents recorded</p>
            </div>
          ) : (
            incidents.map((incident: any) => (
              <div key={incident.id} className={`flex items-center justify-between p-6 bg-dark-950 border rounded-2xl group transition-all ${incident.status === 'active' ? 'border-orange-500/30' : 'border-dark-800'}`}>
                <div className="flex items-center gap-6 min-w-0 flex-1">
                  <div className={`w-12 h-12 bg-dark-900 rounded-xl flex items-center justify-center font-black border border-dark-800 shrink-0 ${incident.status === 'active' ? 'text-orange-500' : 'text-brand'}`}>
                    {incident.status === 'active' ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-zinc-100 truncate">{incident.title}</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${incident.status === 'active' ? 'bg-orange-500/20 text-orange-400' : 'bg-brand/20 text-brand'}`}>{incident.status}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                      {new Date(incident.created_at).toLocaleString()}
                      {incident.system_name && <span className="ml-3 text-zinc-300">• {incident.system_name}</span>}
                      <span className={`ml-3 ${getStatusColor(incident.impact_status)}`}>{getStatusLabel(incident.impact_status)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {incident.status === 'active' && (
                    <button onClick={() => handleResolveIncident(incident.id)} className="text-brand hover:text-brand/80 text-[10px] font-black uppercase tracking-widest bg-brand/5 px-4 py-2 rounded-xl border border-brand/20">Resolve</button>
                  )}
                  <button onClick={() => handleDeleteIncident(incident.id)} className="text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest bg-rose-500/5 px-4 py-2 rounded-xl">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default PublicManagement;

