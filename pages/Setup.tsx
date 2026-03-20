import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSetup, checkSetupStatus } from '../api';
import { Shield, Activity } from '../components/Icons';

interface Props {
  onSetupComplete: (token: string) => void;
}

const Setup: React.FC<Props> = ({ onSetupComplete }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSetupStatus().then(res => {
      if (res.setupComplete) navigate('/madexadm', { replace: true });
    }).catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await performSetup({ username, email, password });
      onSetupComplete(result.token);
      navigate('/admindashboard');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-in fade-in zoom-in duration-300">
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-brand"></div>

          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(2,141,134,0.15)] mb-6">
              <Activity className="w-12 h-12 text-brand" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Madex Status Setup</h1>
            <p className="text-zinc-500 text-sm mt-2 font-medium text-center max-w-sm">
              Create your admin account to get started. This can only be done once.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Username</label>
              <input
                required
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none transition-all text-white font-medium"
                placeholder="admin"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none transition-all text-white font-medium"
                placeholder="admin@madex-it.ch"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none transition-all text-white font-medium"
                placeholder="••••••••"
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none transition-all text-white font-medium"
                placeholder="••••••••"
                minLength={8}
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <p className="text-xs text-rose-500 font-bold text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-brand text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-opacity-90 transition-all shadow-[0_10px_30px_rgba(2,141,134,0.3)] active:scale-95 disabled:opacity-50 mt-4"
            >
              {loading ? 'Creating Account...' : 'Create Admin Account'}
            </button>
          </form>

          <div className="mt-8 bg-dark-950 border border-dark-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-brand shrink-0" />
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                This account will have full admin privileges. You can create additional users after setup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
