import React from 'react';
import { createPortal } from 'react-dom';
import { X, Server, Shield, Network, HardDrive, Cpu, Terminal, FileText, Cpu as ChipIcon, List } from 'lucide-react';

interface Component {
  id: string;
  definition?: {
    name: string;
    model: string;
  };
  serial_number: string | null;
}

interface Location {
  id?: string;
  name: string;
  timezone?: string;
}

interface Box {
  id: string;
  internal_sn: string;
  mac_address: string;
  ip_address: string | null;
  status: 'NEW' | 'STAGING' | 'INSTALLING' | 'ACTIVE' | 'MAINTENANCE';
  location: Location | null;
  installation_progress: number;
  hardware_inventory: {
    cpu?: string;
    memory?: string;
    disk?: string;
    interfaces?: string;
    usb_devices?: string;
    pci_devices?: string;
    serial_ports?: string;
  } | null;
  components: Component[];
}

interface BoxDetailsModalProps {
  box: Box;
  onClose: () => void;
}

export default function BoxDetailsModal({ box, onClose }: BoxDetailsModalProps) {
  const getStatusClass = (status: Box['status']) => {
    const badges = {
      NEW: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
      STAGING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      INSTALLING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      MAINTENANCE: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    };
    return badges[status] || badges.NEW;
  };

  const inventoryItems = [
    { label: 'Processor', value: box.hardware_inventory?.cpu, icon: <Cpu size={14} className="text-indigo-400" /> },
    { label: 'Memory', value: box.hardware_inventory?.memory, icon: <Server size={14} className="text-emerald-400" /> },
    { label: 'Storage', value: box.hardware_inventory?.disk, icon: <HardDrive size={14} className="text-amber-400" /> },
    { label: 'Interfaces', value: box.hardware_inventory?.interfaces, icon: <Network size={14} className="text-blue-400" /> },
    { label: 'Serial Ports', value: box.hardware_inventory?.serial_ports, icon: <Terminal size={14} className="text-zinc-400" /> },
    { label: 'USB Controllers', value: box.hardware_inventory?.usb_devices, icon: <ChipIcon size={14} className="text-rose-400" /> }
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Server size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">{box.internal_sn}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusClass(box.status)}`}>
                  {box.status} {box.status === 'INSTALLING' ? `(${box.installation_progress}%)` : ''}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{box.mac_address}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Specs and Meta */}
          <div className="space-y-5 lg:col-span-1 border-r border-zinc-800/50 pr-0 lg:pr-6">
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Device Profiles</h4>
              
              <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-xl space-y-3.5 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">IP Address</span>
                  <span className="font-mono text-zinc-200">{box.ip_address || 'DHCP (Dynamic)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Location</span>
                  <span className="text-zinc-200">{box.location ? box.location.name : 'Unassigned'}</span>
                </div>
                {box.location?.timezone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Timezone</span>
                    <span className="font-mono text-zinc-200">{box.location.timezone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Installer Endpoints</h4>
              <div className="flex flex-col gap-2 font-mono text-[10px]">
                <a
                  href={`/api/provision/${box.mac_address.replace(/:/g, '-')}/preseed.cfg`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-850 rounded-lg text-indigo-400 hover:bg-indigo-950/20 transition-all"
                >
                  <span className="flex items-center gap-1.5"><FileText size={12} /> preseed.cfg</span>
                  <span className="text-zinc-600">GET</span>
                </a>
                <a
                  href={`/api/provision/${box.mac_address.replace(/:/g, '-')}/user-data`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-850 rounded-lg text-indigo-400 hover:bg-indigo-950/20 transition-all"
                >
                  <span className="flex items-center gap-1.5"><FileText size={12} /> user-data</span>
                  <span className="text-zinc-600">GET</span>
                </a>
                <a
                  href={`/api/provision/${box.mac_address.replace(/:/g, '-')}/init.sh`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-850 rounded-lg text-indigo-400 hover:bg-indigo-950/20 transition-all"
                >
                  <span className="flex items-center gap-1.5"><Terminal size={12} /> init.sh</span>
                  <span className="text-zinc-600">GET</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Hardware and Components */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hardware Inventory Section */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Hardware Inspection Report</h4>
              
              {!box.hardware_inventory ? (
                <div className="border border-zinc-900 bg-zinc-900/10 p-8 rounded-xl text-center text-zinc-500 text-xs italic">
                  No hardware inventory reported yet. The report is submitted dynamically when the device completes running init.sh post-installation scripts.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inventoryItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <p className="text-xs font-mono text-zinc-200 break-words leading-normal">
                        {item.value || '—'}
                      </p>
                    </div>
                  ))}
                  {box.hardware_inventory?.pci_devices && (
                    <div className="sm:col-span-2 p-3.5 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
                        <List size={14} className="text-indigo-400" />
                        <span>PCI & Video Capture Hardware</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-300 max-h-[120px] overflow-y-auto divide-y divide-zinc-900">
                        {box.hardware_inventory.pci_devices.split(';').map((pci, i) => (
                          <div key={i} className="py-1">{pci.trim()}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Configured Components */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Assigned Physical Hardware Modules</h4>
              {box.components.length === 0 ? (
                <p className="text-zinc-600 text-xs italic">No specific component definitions mapped to this unit.</p>
              ) : (
                <div className="border border-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-900 bg-zinc-900/20 text-xs">
                  {box.components.map((comp) => (
                    <div key={comp.id} className="p-3 flex items-center justify-between text-zinc-300">
                      <div>
                        <span className="font-bold text-zinc-200">{comp.definition?.name || 'Component'}</span>
                        <span className="text-[10px] text-zinc-500 ml-2 font-mono">{comp.definition?.model}</span>
                      </div>
                      <span className="font-mono text-zinc-400 text-[10px]">{comp.serial_number || 'No serial'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
