import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { Save, Info } from 'lucide-react';
import LocationsManagement from './LocationsManagement';

interface SettingItem {
  key: string;
  value: string;
}

export default function ProfilesTab() {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<'defaults' | 'locations'>('defaults');

  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const timezoneOptions = React.useMemo(() => {
    let zones: string[] = [];
    try {
      zones = (Intl as any).supportedValuesOf('timeZone') || [];
    } catch (e) {
      zones = [
        'UTC', 'Europe/Kyiv', 'Asia/Tashkent', 'Europe/London', 'Europe/Paris',
        'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo',
        'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Yekaterinburg'
      ];
    }
    return zones;
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateSettingValue = (key: string, value: string) => {
    setSettings(prev => {
      if (prev.some(s => s.key === key)) {
        return prev.map(s => s.key === key ? { ...s, value } : s);
      }
      return [...prev, { key, value }];
    });
  };

  const getSetting = (key: string, fallback: string = '') => {
    return settings.find(s => s.key === key)?.value || fallback;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to save: ${errData.detail || res.status}`);
      }
    } catch (err) {
      console.error(err);
      alert('Save failed. Check console.');
    } finally {
      setSavingSettings(false);
    }
  };

  const subTabBtn = (id: 'defaults' | 'locations', label: string) => (
    <button
      key={id}
      onClick={() => setSubTab(id)}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
        subTab === id
          ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-800'
          : 'text-zinc-400 hover:text-zinc-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Page Header & Sub-tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{t('tabProfiles')}</h2>
          <p className="text-zinc-400 text-xs mt-1">{t('profilesSub')}</p>
        </div>
        <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 w-full md:w-auto overflow-x-auto">
          {subTabBtn('defaults', t('profilesSubTabDefaults'))}
          {subTabBtn('locations', t('settingsSubTabLocations'))}
        </div>
      </div>

      {/* Sub-tab: Default Profile */}
      {subTab === 'defaults' && (
        <div className="w-full space-y-4">
          {loadingSettings ? (
            <div className="h-32 flex items-center justify-center text-zinc-500 text-xs">Loading…</div>
          ) : (
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-xl shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-850">
                <Info size={16} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{t('profilesDefaultTitle')}</span>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Localization */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">{t('settingsProvisionDefaults')}</span>
                  <p className="text-[10px] text-zinc-450 leading-relaxed">{t('descProvisionDefaults')}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultTz')}</label>
                      <select
                        value={getSetting('DEFAULT_TIMEZONE', 'UTC')}
                        onChange={(e) => updateSettingValue('DEFAULT_TIMEZONE', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none cursor-pointer"
                      >
                        {timezoneOptions.map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-zinc-500 mt-1">{t('descDefaultTz')}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultLocale')}</label>
                      <select
                        value={getSetting('DEFAULT_LOCALE', 'en_US.UTF-8')}
                        onChange={(e) => updateSettingValue('DEFAULT_LOCALE', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none cursor-pointer"
                      >
                        <option value="en_US.UTF-8">English (en_US.UTF-8)</option>
                        <option value="ru_RU.UTF-8">Russian (ru_RU.UTF-8)</option>
                        <option value="uk_UA.UTF-8">Ukrainian (uk_UA.UTF-8)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultKeyboard')}</label>
                      <select
                        value={getSetting('DEFAULT_KEYBOARD', 'us')}
                        onChange={(e) => updateSettingValue('DEFAULT_KEYBOARD', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none cursor-pointer"
                      >
                        <option value="us">United States (us)</option>
                        <option value="ru">Russian (ru)</option>
                        <option value="ua">Ukrainian (ua)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultMirror')}</label>
                      <input
                        type="text"
                        value={getSetting('DEFAULT_PACKAGE_MIRROR', 'deb.debian.org')}
                        onChange={(e) => updateSettingValue('DEFAULT_PACKAGE_MIRROR', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                        placeholder="e.g. deb.debian.org"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultNtp')}</label>
                      <input
                        type="text"
                        value={getSetting('DEFAULT_NTP', 'pool.ntp.org')}
                        onChange={(e) => updateSettingValue('DEFAULT_NTP', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                        placeholder="e.g. pool.ntp.org"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultGateway')}</label>
                      <input
                        type="text"
                        value={getSetting('DEFAULT_GATEWAY')}
                        onChange={(e) => updateSettingValue('DEFAULT_GATEWAY', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                        placeholder="e.g. 192.168.1.1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultDns')}</label>
                      <input
                        type="text"
                        value={getSetting('DEFAULT_DNS')}
                        onChange={(e) => updateSettingValue('DEFAULT_DNS', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                        placeholder="e.g. 8.8.8.8"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultSsh')}</label>
                    <textarea
                      rows={3}
                      value={getSetting('DEFAULT_SSH_PUBLIC_KEY')}
                      onChange={(e) => updateSettingValue('DEFAULT_SSH_PUBLIC_KEY', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-200 p-2.5 rounded-lg outline-none font-mono resize-y"
                      placeholder="ssh-rsa AAAA..."
                    />
                  </div>
                </div>

                {/* Default Accounts */}
                <div className="pt-3 border-t border-zinc-850 space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">{t('profilesDefaultAccounts')}</span>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('settingsDefaultRootPassword')}</label>
                    <input
                      type="password"
                      value={getSetting('DEFAULT_ROOT_PASSWORD')}
                      onChange={(e) => updateSettingValue('DEFAULT_ROOT_PASSWORD', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                      placeholder="••••••••"
                    />
                    <p className="text-[9px] text-zinc-500 mt-1">{t('descDefaultRootPassword')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Default Username</label>
                      <input
                        type="text"
                        value={getSetting('DEFAULT_USER_USERNAME')}
                        onChange={(e) => updateSettingValue('DEFAULT_USER_USERNAME', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                        placeholder="e.g. user (leave blank to disable user creation)"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">User Full Name</label>
                      <input
                        type="text"
                        value={getSetting('DEFAULT_USER_FULLNAME')}
                        onChange={(e) => updateSettingValue('DEFAULT_USER_FULLNAME', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                        placeholder="e.g. Default User"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">User Password</label>
                    <input
                      type="password"
                      value={getSetting('DEFAULT_USER_PASSWORD')}
                      onChange={(e) => updateSettingValue('DEFAULT_USER_PASSWORD', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                      placeholder="••••••••"
                    />
                    <p className="text-[9px] text-zinc-500 mt-1">Leave blank to keep existing password.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-850 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    <Save size={14} />
                    <span>{savingSettings ? 'Saving...' : t('save')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab: Location Profiles */}
      {subTab === 'locations' && <LocationsManagement />}
    </div>
  );
}
