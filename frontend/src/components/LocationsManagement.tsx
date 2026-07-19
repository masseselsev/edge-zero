import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Save, X, Edit, Network, Globe } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  description: string | null;
  timezone: string;
  locale: string;
  keyboard: string;
  gateway: string | null;
  netmask: string | null;
  dns_server: string | null;
  ntp_server: string | null;
  package_mirror: string | null;
  ssh_public_key: string | null;
}

export default function LocationsManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({
    name: '',
    description: '',
    timezone: 'UTC',
    locale: 'en_US.UTF-8',
    keyboard: 'us',
    gateway: '',
    netmask: '',
    dns_server: '',
    ntp_server: '',
    package_mirror: '',
    ssh_public_key: ''
  });

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations/');
      if (res.ok) {
        setLocations(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSelect = (loc: Location) => {
    setSelectedLoc(loc);
    setForm({
      name: loc.name,
      description: loc.description || '',
      timezone: loc.timezone,
      locale: loc.locale,
      keyboard: loc.keyboard,
      gateway: loc.gateway || '',
      netmask: loc.netmask || '',
      dns_server: loc.dns_server || '',
      ntp_server: loc.ntp_server || '',
      package_mirror: loc.package_mirror || '',
      ssh_public_key: loc.ssh_public_key || ''
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedLoc(null);
    setForm({
      name: '',
      description: '',
      timezone: 'UTC',
      locale: 'en_US.UTF-8',
      keyboard: 'us',
      gateway: '',
      netmask: '',
      dns_server: '',
      ntp_server: '',
      package_mirror: '',
      ssh_public_key: ''
    });
    setIsEditing(false);
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanForm = {
      ...form,
      description: form.description || null,
      gateway: form.gateway || null,
      netmask: form.netmask || null,
      dns_server: form.dns_server || null,
      ntp_server: form.ntp_server || null,
      package_mirror: form.package_mirror || null,
      ssh_public_key: form.ssh_public_key || null
    };

    try {
      const url = isCreating ? '/api/locations/' : `/api/locations/${selectedLoc?.id}`;
      const method = isCreating ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanForm)
      });

      if (res.ok) {
        setIsCreating(false);
        setIsEditing(false);
        setSelectedLoc(null);
        fetchLocations();
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail || 'Failed to save'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Location? Devices using it will be unassigned.')) return;
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIsCreating(false);
        setIsEditing(false);
        setSelectedLoc(null);
        fetchLocations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-zinc-500 italic py-4 animate-pulse">Loading Locations...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <MapPin size={14} className="text-zinc-500" />
          <span>Provision Profiles (Locations)</span>
        </h3>
        <button
          onClick={handleStartCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          <Plus size={14} />
          <span>Add Location</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Locations List */}
        <div className="md:col-span-1 border border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden divide-y divide-zinc-850">
          {locations.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 italic text-xs">No Locations added yet.</div>
          ) : (
            locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelect(loc)}
                className={`w-full text-left p-3.5 flex items-center justify-between text-xs hover:bg-zinc-800/40 transition-colors ${
                  selectedLoc?.id === loc.id ? 'bg-indigo-600/10 border-l-2 border-indigo-500' : ''
                }`}
              >
                <div>
                  <p className="font-bold text-zinc-200">{loc.name}</p>
                  <p className="text-zinc-500 text-[10px] mt-0.5 truncate max-w-[180px]">
                    {loc.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                    {loc.timezone}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Editor Panel */}
        <div className="md:col-span-2">
          {isEditing || isCreating ? (
            <form onSubmit={handleSave} className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Edit size={12} className="text-zinc-500" />
                  <span>{isCreating ? 'Create Provision Profile' : `Configure: ${selectedLoc?.name}`}</span>
                </span>
                <div className="flex items-center gap-2">
                  {!isCreating && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedLoc!.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded cursor-pointer transition-colors"
                      title="Delete Profile"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setIsCreating(false); }}
                    className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded cursor-pointer transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                    placeholder="e.g. Tashkent Lab"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
                    placeholder="Description or notes"
                  />
                </div>

                {/* Section Header */}
                <div className="sm:col-span-2 pt-2 border-t border-zinc-850 flex items-center gap-1.5 text-zinc-400">
                  <Globe size={11} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Localization</span>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. Asia/Tashkent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Locale</label>
                  <input
                    type="text"
                    value={form.locale}
                    onChange={(e) => setForm({ ...form, locale: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. ru_RU.UTF-8"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Keyboard Map</label>
                  <input
                    type="text"
                    value={form.keyboard}
                    onChange={(e) => setForm({ ...form, keyboard: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. ru"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Package Mirror</label>
                  <input
                    type="text"
                    value={form.package_mirror}
                    onChange={(e) => setForm({ ...form, package_mirror: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. uz.debian.org"
                  />
                </div>

                {/* Network Profile Section */}
                <div className="sm:col-span-2 pt-2 border-t border-zinc-850 flex items-center gap-1.5 text-zinc-400">
                  <Network size={11} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Network settings</span>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Gateway</label>
                  <input
                    type="text"
                    value={form.gateway}
                    onChange={(e) => setForm({ ...form, gateway: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. 192.168.1.1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Netmask</label>
                  <input
                    type="text"
                    value={form.netmask}
                    onChange={(e) => setForm({ ...form, netmask: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. 255.255.255.0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DNS Server</label>
                  <input
                    type="text"
                    value={form.dns_server}
                    onChange={(e) => setForm({ ...form, dns_server: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. 8.8.8.8"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">NTP Server</label>
                  <input
                    type="text"
                    value={form.ntp_server}
                    onChange={(e) => setForm({ ...form, ntp_server: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. pool.ntp.org"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">SSH Authorized Key</label>
                  <textarea
                    rows={3}
                    value={form.ssh_public_key}
                    onChange={(e) => setForm({ ...form, ssh_public_key: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono resize-y"
                    placeholder="ssh-rsa AAAA..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-850 flex items-center justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <Save size={13} />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="border border-zinc-800 border-dashed p-10 rounded-xl text-center text-zinc-500 text-xs italic bg-zinc-900/10">
              Select a location configuration from the list or add a new one to manage its provisioning profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
