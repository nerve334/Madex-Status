import React, { useState, useEffect, useCallback } from 'react';
import { getNotificationChannels, createNotificationChannel, updateNotificationChannel, deleteNotificationChannel, testNotificationWebhook } from '../api';
import { Bell, CheckCircle, XCircle, Activity } from '../components/Icons';

const Notifications: React.FC = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean } | null>(null);

  const [form, setForm] = useState({
    name: '',
    webhook_url: '',
    server_id: '',
    channel_id: '',
    notify_up: true,
    notify_down: true,
  });

  const fetchChannels = useCallback(async () => {
    try {
      const data = await getNotificationChannels();
      setChannels(data);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const resetForm = () => {
    setForm({ name: '', webhook_url: '', server_id: '', channel_id: '', notify_up: true, notify_down: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateNotificationChannel(editing.id, {
          name: form.name,
          webhook_url: form.webhook_url,
          notify_up: form.notify_up ? 1 : 0,
          notify_down: form.notify_down ? 1 : 0,
        });
      } else {
        await createNotificationChannel({
          name: form.name,
          type: 'discord',
          webhook_url: form.webhook_url,
          notify_up: form.notify_up ? 1 : 0,
          notify_down: form.notify_down ? 1 : 0,
        });
      }
      resetForm();
      fetchChannels();
    } catch (err) {
      console.error('Failed to save channel:', err);
    }
  };

  const handleEdit = (channel: any) => {
    setForm({
      name: channel.name,
      webhook_url: channel.webhook_url,
      server_id: '',
      channel_id: '',
      notify_up: !!channel.notify_up,
      notify_down: !!channel.notify_down,
    });
    setEditing(channel);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notification channel?')) return;
    await deleteNotificationChannel(id);
    fetchChannels();
  };

  const handleTest = async (channel: any) => {
    setTesting(channel.id);
    setTestResult(null);
    try {
      const result = await testNotificationWebhook(channel.webhook_url);
      setTestResult({ id: channel.id, success: result.success });
    } catch {
      setTestResult({ id: channel.id, success: false });
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-zinc-500 mt-1">Configure Discord webhooks for status alerts.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-6 py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
        >
          + Add Channel
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-black tracking-tight mb-6">
            {editing ? 'Edit Channel' : 'New Discord Channel'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-wider mb-2">Channel Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. #status-alerts"
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-brand focus:outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-wider mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={form.webhook_url}
                  onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-brand focus:outline-none transition-colors font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-wider mb-2">Server ID <span className="text-zinc-600">(optional, for reference)</span></label>
                <input
                  type="text"
                  value={form.server_id}
                  onChange={(e) => setForm({ ...form, server_id: e.target.value })}
                  placeholder="e.g. 123456789012345678"
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-brand focus:outline-none transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-wider mb-2">Channel ID <span className="text-zinc-600">(optional, for reference)</span></label>
                <input
                  type="text"
                  value={form.channel_id}
                  onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
                  placeholder="e.g. 987654321098765432"
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-brand focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_up}
                  onChange={(e) => setForm({ ...form, notify_up: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-800 bg-dark-950 text-brand focus:ring-brand"
                />
                <span className="text-sm text-zinc-300 font-bold">Notify on Recovery (Up)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_down}
                  onChange={(e) => setForm({ ...form, notify_down: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-800 bg-dark-950 text-brand focus:ring-brand"
                />
                <span className="text-sm text-zinc-300 font-bold">Notify on Down</span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" className="px-6 py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                {editing ? 'Update' : 'Create'} Channel
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-3 bg-dark-800 text-zinc-400 rounded-xl text-xs font-black uppercase tracking-widest hover:text-zinc-200 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Channels List */}
      {channels.length === 0 && !showForm ? (
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-16 text-center shadow-2xl">
          <Bell className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
          <p className="text-zinc-500 font-bold text-lg mb-2">No notification channels configured</p>
          <p className="text-zinc-600 text-sm mb-6">Set up a Discord webhook to receive alerts when monitors go down or recover.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-6 py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
          >
            Add Your First Channel
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel: any) => (
            <div key={channel.id} className="bg-dark-900 border border-dark-800 rounded-3xl p-6 shadow-xl hover:border-brand/20 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-3 rounded-2xl border border-white/5 ${channel.active ? 'bg-brand/10 text-brand' : 'bg-zinc-500/10 text-zinc-500'}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-lg text-zinc-100 tracking-tight">{channel.name}</h4>
                    <p className="text-xs text-zinc-500 font-mono truncate max-w-[400px]">{channel.webhook_url}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {channel.notify_down ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Down alerts</span>
                      ) : null}
                      {channel.notify_up ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded">Recovery alerts</span>
                      ) : null}
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${channel.active ? 'text-brand bg-brand/10' : 'text-zinc-500 bg-zinc-500/10'}`}>
                        {channel.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTest(channel)}
                    disabled={testing === channel.id}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      testResult?.id === channel.id
                        ? testResult.success
                          ? 'bg-brand/20 text-brand border border-brand/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-dark-800 text-zinc-400 hover:text-zinc-200 border border-dark-700'
                    }`}
                  >
                    {testing === channel.id ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        Testing...
                      </span>
                    ) : testResult?.id === channel.id ? (
                      <span className="flex items-center gap-2">
                        {testResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {testResult.success ? 'Success!' : 'Failed'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" />
                        Test
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(channel)}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-dark-800 text-zinc-400 hover:text-zinc-200 border border-dark-700 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(channel.id)}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-dark-800 text-rose-400 hover:bg-rose-500/10 border border-dark-700 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
