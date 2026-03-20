import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from '../components/Icons';
import { login } from '../api';

interface Props {
  onLogin: (token: string) => void;
  isAuthenticated: boolean;
}

const Login: React.FC<Props> = ({ onLogin, isAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/admindashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      onLogin(result.token);
      navigate('/admindashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-brand"></div>
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(2,141,134,0.15)] mb-6">
              <Shield className="w-10 h-10 text-brand" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Madex Admin</h1>
            <p className="text-zinc-500 text-sm mt-2 font-medium">Sign in to manage your monitors</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Username / Email</label>
              <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none transition-all text-white font-medium" placeholder="Your username or email" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none transition-all text-white font-medium" placeholder="••••••••" />
            </div>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <p className="text-xs text-rose-500 font-bold text-center">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full py-5 bg-brand text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-opacity-90 transition-all shadow-[0_10px_30px_rgba(2,141,134,0.3)] active:scale-95 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-10 text-center">
            <button onClick={() => navigate('/')} className="text-[10px] text-zinc-600 hover:text-zinc-400 font-black uppercase tracking-widest transition-colors">← Back to Status Page</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

