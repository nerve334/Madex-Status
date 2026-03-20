import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, deleteUser as deleteUserApi } from '../api';
import { Shield } from '../components/Icons';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'manager' });

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createUser(newUser);
      setNewUser({ username: '', email: '', password: '', role: 'manager' });
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      await deleteUserApi(id);
      await fetchUsers();
    } catch (err: any) { alert(err.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-zinc-500 mt-1 font-medium">Manage team members and access permissions.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-brand text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">+ Add User</button>
      </div>

      <div className="bg-dark-900 border border-dark-800 rounded-[32px] overflow-hidden shadow-2xl">
        {users.length === 0 ? (
          <div className="p-16 text-center">
            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold">No users found</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-950/50 border-b border-dark-800">
                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">User</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Role</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Created</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-dark-950/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-center font-black text-brand">{user.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-bold text-zinc-200">{user.username}</p>
                        <p className="text-xs text-zinc-500 font-mono">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-brand/10 text-brand border-brand/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>{user.role}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs text-zinc-500 font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => handleDeleteUser(user.id)} className="text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest p-2 rounded-xl hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-dark-900 border border-dark-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black mb-8 tracking-tight">New User</h2>
            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none text-white text-sm" placeholder="Username" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none text-white text-sm" placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none text-white text-sm" placeholder="Min. 8 characters" minLength={8} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-dark-950 border border-dark-800 rounded-2xl px-5 py-4 focus:ring-1 focus:ring-brand outline-none text-white text-sm appearance-none">
                  <option value="admin">Admin (Full Access)</option>
                  <option value="manager">Manager (Limited)</option>
                </select>
              </div>
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  <p className="text-xs text-rose-500 font-bold text-center">{error}</p>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setError(''); }} className="flex-1 py-4 bg-dark-950 border border-dark-800 text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg disabled:opacity-50">{saving ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

