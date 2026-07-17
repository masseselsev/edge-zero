import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { Save, Plus, Trash2, Users, Shield } from 'lucide-react';

interface SettingItem {
  key: string;
  value: string;
}

interface UserAccount {
  id: string;
  username: string;
  role: string;
  telegram_id: string | null;
}

export default function SettingsTab() {
  const { t } = useTranslation();
  
  // Settings State
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Users State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'administrator',
    telegram_id: ''
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/system/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      // Exclude Project Name and language keys if they happen to remain in frontend state
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Settings updated successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          role: newUser.role,
          telegram_id: newUser.telegram_id || null
        })
      });
      if (res.ok) {
        setShowAddUserModal(false);
        setNewUser({ username: '', password: '', role: 'administrator', telegram_id: '' });
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(`Failed to create user: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/system/users/${userId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(`Failed to delete user: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateSettingValue = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  if (loadingSettings || loadingUsers) {
    return <div className="text-zinc-500 text-sm animate-pulse">{t('loading')}</div>;
  }

  const api_host = settings.find(s => s.key === 'API_HOST')?.value || '192.168.222.2';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{t('settingsTitle')}</h2>
          <p className="text-zinc-400 text-xs mt-1">{t('settingsSub')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Orchestrator Configuration (1 col) */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">System Preferences</h3>
          <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-xl shadow-sm">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">API Host Address</label>
                <input
                  type="text"
                  value={api_host}
                  onChange={(e) => updateSettingValue('API_HOST', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                  placeholder="e.g. 192.168.222.2"
                />
              </div>

              <div className="pt-4 border-t border-zinc-850 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <Save size={14} />
                  <span>{savingSettings ? 'Saving...' : t('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* User Accounts Management (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Users size={14} className="text-zinc-500" />
              <span>User Accounts</span>
            </h3>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-400">
                <tr className="border-b border-zinc-800 text-zinc-400 font-bold">
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Role / Access Level</th>
                  <th className="px-6 py-3">Telegram ID</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 italic">No user accounts registered.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-900/20 text-zinc-300">
                      <td className="px-6 py-4 font-bold text-zinc-200">{u.username}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.role === 'administrator' 
                            ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30' 
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                        }`}>
                          <Shield size={10} />
                          <span className="capitalize">{u.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-450">{u.telegram_id || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-450 rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Delete Account"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-modal-in">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200">Register New User Account</h3>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg focus:border-indigo-500 outline-none"
                  placeholder="e.g. system_operator"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg focus:border-indigo-500 outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Telegram ID (Optional)</label>
                <input
                  type="text"
                  value={newUser.telegram_id}
                  onChange={(e) => setNewUser({...newUser, telegram_id: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg focus:border-indigo-500 outline-none"
                  placeholder="e.g. 123456789"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Role / Access Level</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg focus:border-indigo-500 outline-none cursor-pointer"
                >
                  <option value="administrator">Administrator</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
                <p className="text-[9px] text-zinc-500 mt-1">Pre-configures user level access bounds for orchestrator nodes and settings.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-450 hover:text-zinc-200 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
