# Edge B.R.O. Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dedicated tab that monitors and transfers provisioned edge boxes from Overwatch (Zero-Touch Onboarding Hub) to Edge B.R.O. (Backup & Restore Orchestrator).

**Architecture:** 
1. Overwatch backend queries the Edge B.R.O. API using dynamically fetched credentials, matches serial numbers, and provides a unified dashboard of sync statuses.
2. Direct sync action requests execute POST requests to Edge B.R.O.'s node registration endpoints.
3. UI elements added in Layout, App, Header, and Settings to expose the credentials setup and fleet backup states.

**Tech Stack:** FastAPI, SQLAlchemy, httpx, React, TypeScript, TailwindCSS.

## Global Constraints
- NO file may exceed 500-600 lines.
- All backend HTTP requests must be asynchronous (`httpx.AsyncClient`).
- Multilanguage strings must cover English, Russian, and Ukrainian.

---

### Task 1: Backend Integration Endpoints & Helpers

**Files:**
- Modify: `backend/app/api/endpoints/system.py` (add endpoints)

**Interfaces:**
- Produces: `GET /api/system/edge-bro/status` returning node backup matches
- Produces: `POST /api/system/edge-bro/sync` executing box transfers

- [ ] **Step 1: Implement Edge B.R.O. client helper functions and routers**
  At the end of `backend/app/api/endpoints/system.py`, add:
  ```python
  import httpx
  from pydantic import BaseModel

  class EdgeBroSyncRequest(BaseModel):
      box_ids: List[str]

  async def get_edge_bro_client(db: AsyncSession):
      """Helper to fetch settings and log in to Edge B.R.O., returning AsyncClient with Auth token."""
      from app.api.endpoints.provision import get_system_setting
      url = await get_system_setting(db, "EDGE_BRO_URL", "http://localhost:8000")
      user = await get_system_setting(db, "EDGE_BRO_USER", "admin")
      password = await get_system_setting(db, "EDGE_BRO_PASSWORD", "admin")

      client = httpx.AsyncClient(base_url=url, timeout=10.0)
      try:
          resp = await client.post("/api/auth/login", json={"username": user, "password": password})
          if resp.status_code == 200:
              token = resp.json().get("access_token")
              client.headers.update({"Authorization": f"Bearer {token}"})
              return client, url, None
          else:
              return None, url, f"Login failed: {resp.status_code} {resp.text}"
      except Exception as e:
          return None, url, str(e)

  @router.get("/edge-bro/status")
  async def get_edge_bro_status(db: AsyncSession = Depends(get_db)):
      """Checks connection status and queries matched nodes from Edge B.R.O."""
      from app.models.box import Box, BoxStatus
      from sqlalchemy import or_
      
      client, url, err = await get_edge_bro_client(db)
      if err:
          return {"status": "error", "message": err, "url": url, "nodes": []}

      try:
          # Query B.R.O. nodes
          resp = await client.get("/api/nodes?limit=1000")
          if resp.status_code != 200:
              await client.aclose()
              return {"status": "error", "message": f"Fetch nodes failed: {resp.status_code}", "url": url, "nodes": []}
          
          bro_nodes = resp.json().get("nodes", [])
          bro_map = {node["hostname"].upper(): node for node in bro_nodes}
      except Exception as e:
          await client.aclose()
          return {"status": "error", "message": str(e), "url": url, "nodes": []}
      finally:
          if client:
              await client.aclose()

      # Query Overwatch boxes
      result = await db.execute(
          select(Box).where(
              or_(Box.status == BoxStatus.ACTIVE, Box.status == BoxStatus.MAINTENANCE)
          )
      )
      boxes = result.scalars().all()

      nodes_list = []
      for box in boxes:
          bro_node = bro_map.get(box.internal_sn.upper())
          nodes_list.append({
              "id": str(box.id),
              "internal_sn": box.internal_sn,
              "mac_address": box.mac_address,
              "ip_address": box.ip_address,
              "overwatch_status": box.status,
              "edge_bro_status": bro_node["status"] if bro_node else "NOT_REGISTERED",
              "edge_bro_id": bro_node["id"] if bro_node else None,
              "last_backup": bro_node["last_backup"] if bro_node else None
          })

      return {"status": "connected", "url": url, "nodes": nodes_list}

  @router.post("/edge-bro/sync")
  async def sync_edge_bro_nodes(payload: EdgeBroSyncRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
      """Registers requested Overwatch boxes to Edge B.R.O."""
      from app.models.box import Box
      
      client, url, err = await get_edge_bro_client(db)
      if err:
          raise HTTPException(status_code=500, detail=f"Failed to reach Edge B.R.O.: {err}")

      results = []
      try:
          for bid in payload.box_ids:
              result = await db.execute(select(Box).where(Box.id == bid))
              box = result.scalars().first()
              if not box:
                  results.append({"box_id": bid, "status": "error", "detail": "Box not found"})
                  continue

              # Call register in B.R.O.
              node_payload = {
                  "hostname": box.internal_sn,
                  "ip_address": box.ip_address,
                  "ssh_port": box.ssh_port or 2222,
                  "bootstrap_user": box.ssh_username or "user",
                  "bootstrap_password": box.ssh_password or "admin",
                  "auto_detect_hostname": False
              }
              resp = await client.post("/api/nodes", json=node_payload)
              if resp.status_code in (200, 201):
                  results.append({"box_id": bid, "status": "success"})
              else:
                  results.append({"box_id": bid, "status": "error", "detail": f"B.R.O. API returned {resp.status_code}: {resp.text}"})
      finally:
          await client.aclose()

      return {"status": "complete", "results": results}
  ```

- [ ] **Step 2: Verify backend compiles**
  ```bash
  docker compose restart overwatch-core
  docker compose logs overwatch-core --tail=10
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add backend/app/api/endpoints/system.py
  git commit -m "feat: implement status matching and register sync endpoints for Edge B.R.O. integration"
  ```

---

### Task 2: Frontend Integration Tab & Navigation

**Files:**
- Create: `frontend/src/components/EdgeBroTab.tsx` (the new tab dashboard)
- Modify: `frontend/src/App.tsx` (add route)
- Modify: `frontend/src/components/Header.tsx` (add navigation button)

**Interfaces:**
- Produces: Visual backup fleet dashboard tab

- [ ] **Step 1: Create EdgeBroTab component**
  Write a React component inside `frontend/src/components/EdgeBroTab.tsx`:
  ```tsx
  import React, { useState, useEffect } from 'react';
  import { useTranslation } from '../context/TranslationContext';
  import { ShieldAlert, RefreshCw, CloudUpload, CheckCircle, AlertTriangle } from 'lucide-react';

  interface BroNode {
    id: string;
    internal_sn: string;
    mac_address: string;
    ip_address: string;
    overwatch_status: string;
    edge_bro_status: string;
    last_backup: string | null;
  }

  export default function EdgeBroTab() {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
    const [nodes, setNodes] = useState<BroNode[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [syncingIds, setSyncingIds] = useState<string[]>([]);
    const [edgeBroUrl, setEdgeBroUrl] = useState('');

    const fetchStatus = async () => {
      setStatus('loading');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/system/edge-bro/status', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setEdgeBroUrl(data.url || '');
          if (data.status === 'connected') {
            setStatus('connected');
            setNodes(data.nodes);
          } else {
            setStatus('error');
            setErrorMsg(data.message || 'Unknown error');
          }
        } else {
          setStatus('error');
          setErrorMsg('Failed to fetch status from Overwatch server');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Connection failed');
      }
    };

    useEffect(() => {
      fetchStatus();
    }, []);

    const handleSync = async (ids: string[]) => {
      setSyncingIds(prev => [...prev, ...ids]);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/system/edge-bro/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ box_ids: ids })
        });
        if (res.ok) {
          await fetchStatus();
        }
      } catch (err) {
        console.error('Sync error:', err);
      } finally {
        setSyncingIds(prev => prev.filter(x => !ids.includes(x)));
      }
    };

    const getStatusPill = (status: string) => {
      switch (status) {
        case 'READY':
          return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Ready</span>;
        case 'NEEDS_BOOTSTRAP':
          return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Needs Bootstrap</span>;
        case 'OFFLINE':
          return <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Offline</span>;
        case 'NOT_REGISTERED':
          return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Not Registered</span>;
        default:
          return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{status}</span>;
      }
    };

    const unregistered = nodes.filter(n => n.edge_bro_status === 'NOT_REGISTERED');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-50">Edge B.R.O. Backup Integration</h2>
            <p className="text-xs text-zinc-450 mt-1">Manage backup replication and node enrollment in Edge B.R.O. backup cluster.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer outline-none"
            >
              <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {unregistered.length > 0 && (
              <button
                onClick={() => handleSync(unregistered.map(n => n.id))}
                disabled={syncingIds.length > 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CloudUpload size={14} />
                <span>Sync All Unregistered ({unregistered.length})</span>
              </button>
            )}
          </div>
        </div>

        {status === 'error' && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <ShieldAlert size={20} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-rose-300 block">Connection to Edge B.R.O. Failed</span>
              <p className="text-[11px] text-rose-400/80 leading-relaxed mt-1">
                Could not connect to Edge B.R.O. API at <code className="bg-rose-950/40 px-1 py-0.5 rounded font-mono">{edgeBroUrl}</code>. Check your Settings in System Preferences.
              </p>
              <p className="text-[10px] text-rose-500 font-mono mt-1.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/20 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                <th className="px-6 py-3.5">Device SN (Hostname)</th>
                <th className="px-6 py-3.5">MAC Address</th>
                <th className="px-6 py-3.5">IP Address</th>
                <th className="px-6 py-3.5">Overwatch Status</th>
                <th className="px-6 py-3.5">B.R.O. Backup Status</th>
                <th className="px-6 py-3.5">Last Backup</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {nodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 italic text-xs">
                    {status === 'loading' ? 'Checking backup node status...' : 'No active boxes available for backup integration.'}
                  </td>
                </tr>
              ) : (
                nodes.map((node) => (
                  <tr key={node.id} className="hover:bg-zinc-800/20 text-zinc-300 text-xs transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-200">{node.internal_sn}</td>
                    <td className="px-6 py-4 font-mono">{node.mac_address}</td>
                    <td className="px-6 py-4 font-mono text-zinc-400">{node.ip_address}</td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">{node.overwatch_status}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusPill(node.edge_bro_status)}</td>
                    <td className="px-6 py-4 text-zinc-450">{node.last_backup ? new Date(node.last_backup).toLocaleString() : 'Never'}</td>
                    <td className="px-6 py-4 text-right">
                      {node.edge_bro_status === 'NOT_REGISTERED' ? (
                        <button
                          onClick={() => handleSync([node.id])}
                          disabled={syncingIds.includes(node.id)}
                          className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <CloudUpload size={12} className={syncingIds.includes(node.id) ? 'animate-bounce' : ''} />
                          <span>{syncingIds.includes(node.id) ? 'Syncing...' : 'Register'}</span>
                        </button>
                      ) : (
                        <span className="text-zinc-650 inline-flex items-center gap-1 select-none text-[10px] uppercase font-bold pr-2">
                          <CheckCircle size={12} className="text-emerald-500" />
                          <span>Enrolled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Add route in App.tsx**
  In `frontend/src/App.tsx`, import `EdgeBroTab` and add cases:
  ```tsx
  import EdgeBroTab from './components/EdgeBroTab';
  // ...
  // In renderContent():
  case 'edgebro':
    return <EdgeBroTab />;
  ```

- [ ] **Step 3: Update Header.tsx navigation list**
  In `frontend/src/components/Header.tsx`, import `Database` and append `edgebro` to the navigation array:
  ```typescript
  import { Database } from 'lucide-react';
  // ...
  const navItems = [
    { id: 'inventory', label: t('tabInventory'), icon: <Server size={14} /> },
    { id: 'library', label: t('tabLibrary'), icon: <Library size={14} /> },
    { id: 'scripts', label: t('tabInitScripts'), icon: <ScrollText size={14} /> },
    { id: 'logs', label: t('tabLogs'), icon: <Terminal size={14} /> },
    { id: 'settings', label: t('tabSettings'), icon: <Settings size={14} /> },
    { id: 'edgebro', label: 'Edge B.R.O.', icon: <Database size={14} /> }
  ];
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/components/EdgeBroTab.tsx frontend/src/App.tsx frontend/src/components/Header.tsx
  git commit -m "feat: design Edge B.R.O. integration tab with sync actions and navigation links"
  ```

---

### Task 3: Translation Keys & Settings Interface Additions

**Files:**
- Modify: `frontend/src/components/SettingsTab.tsx` (add inputs)
- Modify: `frontend/src/i18n/translations.ts` (add translations)

**Interfaces:**
- Produces: Edge B.R.O. credentials fields in global Preferences Settings card

- [ ] **Step 1: Add inputs to Settings tab UI**
  In `frontend/src/components/SettingsTab.tsx`, add a card under the System Preferences sub-tab:
  ```tsx
  {/* Edge B.R.O. Integration credentials card */}
  <div className="pt-3 border-t border-zinc-850 space-y-4">
    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Edge B.R.O. Integration</span>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Edge B.R.O. Server URL</label>
        <input
          type="text"
          value={getSetting('EDGE_BRO_URL', 'http://localhost:8000')}
          onChange={(e) => updateSettingValue('EDGE_BRO_URL', e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">B.R.O. API Username</label>
        <input
          type="text"
          value={getSetting('EDGE_BRO_USER', 'admin')}
          onChange={(e) => updateSettingValue('EDGE_BRO_USER', e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">B.R.O. API Password</label>
        <input
          type="password"
          value={getSetting('EDGE_BRO_PASSWORD', 'admin')}
          onChange={(e) => updateSettingValue('EDGE_BRO_PASSWORD', e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none"
        />
      </div>
    </div>
  </div>
  ```

- [ ] **Step 2: Add translation tags**
  Append Edge B.R.O. tab titles to `frontend/src/i18n/translations.ts` in English, Russian, and Ukrainian to ensure translations load dynamically.

- [ ] **Step 3: Verify build**
  ```bash
  docker compose exec overwatch-web npm run build
  docker compose restart overwatch-core
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/components/SettingsTab.tsx frontend/src/i18n/translations.ts
  git commit -m "feat: add Edge B.R.O. connection parameters card and translations"
  ```
