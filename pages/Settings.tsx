import React, { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings, getNotificationChannels, createNotificationChannel, updateNotificationChannel, deleteNotificationChannel, testNotificationWebhook } from '../api';
import { Shield, Activity, Globe } from '../components/Icons';

const Settings: React.FC = () => {
  const [settings, setSettingsState] = useState<Record<string, string>>({});
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);

  // New channel form
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', webhook_url: '', notify_up: true, notify_down: true });

  const fetchData = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([getSettings(), getNotificationChannels()]);
      setSettingsState(s);
      setChannels(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settings);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) { alert(err.message); }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNotificationChannel({
        name: newChannel.name,
        webhook_url: newChannel.webhook_url,
        notify_up: newChannel.notify_up ? 1 : 0,
        notify_down: newChannel.notify_down ? 1 : 0,
      });
      setNewChannel({ name: '', webhook_url: '', notify_up: true, notify_down: true });
      setShowChannelForm(false);
      await fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleToggleChannel = async (id: number, active: boolean) => {
    await updateNotificationChannel(id, { active: active ? 1 : 0 });
    await fetchData();
  };

  const handleDeleteChannel = async (id: number) => {
    if (!confirm('Delete this notification channel?')) return;
    await deleteNotificationChannel(id);
    await fetchData();
  };

  const handleTestWebhook = async (id: number, url: string) => {
    setTesting(id);
    try {
      const result = await testNotificationWebhook(url);
      alert(result.success ? 'Test notification sent successfully!' : 'Failed to send test notification.');
    } catch { alert('Test failed'); }
    finally { setTesting(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24">
      <div className="flex items-center justify-between border-b border-dark-800 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">Settings</h1>
          <p className="text-zinc-500 mt-2 font-medium">Manage branding, notifications, and configuration.</p>
        </div>
        <button onClick={handleSaveSettings} className="bg-brand hover:brightness-110 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95">
          {isSaved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branding */}
        <section className="bg-dark-900 border border-dark-800 rounded-[32px] p-10 shadow-xl space-y-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-brand"><Activity className="w-8 h-8" /></div>
            <h2 className="text-xl font-black text-white tracking-tight">Branding</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Brand Name</label>
              <input type="text" value={settings.brand_name || ''} onChange={e => setSettingsState({...settings, brand_name: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-6 py-4 focus:ring-1 focus:ring-brand outline-none text-white font-bold" placeholder="Madex Status" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Logo URL</label>
              <input type="text" value={settings.logo || ''} onChange={e => setSettingsState({...settings, logo: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-6 py-4 focus:ring-1 focus:ring-brand outline-none text-white font-mono text-xs" placeholder="https://example.com/logo.png" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Icon URL</label>
              <input type="text" value={settings.icon || ''} onChange={e => setSettingsState({...settings, icon: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-6 py-4 focus:ring-1 focus:ring-brand outline-none text-white font-mono text-xs" placeholder="https://example.com/icon.png" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Favicon URL</label>
              <input type="text" value={settings.favicon || ''} onChange={e => setSettingsState({...settings, favicon: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-6 py-4 focus:ring-1 focus:ring-brand outline-none text-white font-mono text-xs" placeholder="https://example.com/favicon.ico" />
            </div>
          </div>
        </section>

        {/* Discord Notifications */}
        <section className="bg-dark-900 border border-dark-800 rounded-[32px] p-10 shadow-xl space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><Globe className="w-8 h-8" /></div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Discord Notifications</h2>
                <p className="text-xs text-zinc-500">{channels.length} channel{channels.length !== 1 ? 's' : ''} configured</p>
              </div>
            </div>
            <button onClick={() => setShowChannelForm(!showChannelForm)} className="text-brand text-[10px] font-black uppercase tracking-widest hover:underline">
              {showChannelForm ? 'Cancel' : '+ Add Channel'}
            </button>
          </div>

          {showChannelForm && (
            <form onSubmit={handleAddChannel} className="space-y-4 bg-dark-950 border border-dark-800 rounded-2xl p-6">
              <input required type="text" value={newChannel.name} onChange={e => setNewChannel({...newChannel, name: e.target.value})} className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-brand" placeholder="Channel name (e.g. #alerts)" />
              <input required type="url" value={newChannel.webhook_url} onChange={e => setNewChannel({...newChannel, webhook_url: e.target.value})} className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:ring-1 focus:ring-brand" placeholder="https://discord.com/api/webhooks/..." />
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input type="checkbox" checked={newChannel.notify_down} onChange={e => setNewChannel({...newChannel, notify_down: e.target.checked})} className="accent-brand" /> Notify on Down
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input type="checkbox" checked={newChannel.notify_up} onChange={e => setNewChannel({...newChannel, notify_up: e.target.checked})} className="accent-brand" /> Notify on Recovery
                </label>
              </div>
              <button type="submit" className="w-full py-3 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Add Channel</button>
            </form>
          )}

          <div className="space-y-3">
            {channels.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-dark-800 rounded-2xl">
                <p className="text-zinc-600 text-sm font-bold">No notification channels configured</p>
                <p className="text-zinc-700 text-xs mt-1">Add a Discord webhook to receive alerts</p>
              </div>
            ) : (
              channels.map((ch: any) => (
                <div key={ch.id} className="flex items-center justify-between p-5 bg-dark-950 border border-dark-800 rounded-2xl group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ch.active ? 'bg-brand' : 'bg-zinc-600'}`}></span>
                      <p className="font-bold text-sm text-zinc-200 truncate">{ch.name}</p>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-mono truncate mt-1">{ch.webhook_url}</p>
                    <div className="flex gap-3 mt-2">
                      {ch.notify_down ? <span className="text-[9px] font-black text-rose-400 uppercase">Down alerts</span> : null}
                      {ch.notify_up ? <span className="text-[9px] font-black text-brand uppercase">Recovery alerts</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleTestWebhook(ch.id, ch.webhook_url)} disabled={testing === ch.id} className="px-3 py-2 bg-brand/10 text-brand rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {testing === ch.id ? '...' : 'Test'}
                    </button>
                    <button onClick={() => handleToggleChannel(ch.id, !ch.active)} className="px-3 py-2 bg-dark-900 text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-dark-800">
                      {ch.active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDeleteChannel(ch.id)} className="px-3 py-2 bg-rose-500/10 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;

