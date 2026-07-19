# Orchestrator Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Box Heartbeat monitoring (with online/offline visual indicators), Hardware Audit baseline verification, and a toggleable ProxyDHCP/Full DHCP server configuration.

**Architecture:** 
1. `Box` model gets `last_seen` (DateTime) and `hardware_baseline` (JSON) columns. 
2. A background task in FastAPI monitors heartbeats and triggers Telegram alerts for offline events.
3. The `/api/provision/{mac}/hardware-inventory` endpoint compares reports with the baseline and transitions boxes to `MAINTENANCE` on discrepancies.
4. Settings are expanded with DHCP fields, which dynamically rewrite `/mnt/infra_config/dnsmasq.conf`. An MD5 watchdog loop inside the `infra` container restarts dnsmasq.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, React + TS, TailwindCSS, dnsmasq, Docker.

## Global Constraints
- NO file may exceed 500-600 lines.
- All backend operations must be asynchronous (use `AsyncSession` and async functions).
- Frontend UI elements must adapt correctly to both dark/light mode themes.

---

### Task 1: Heartbeat Monitoring & Online/Offline Indicators

**Files:**
- Modify: `backend/app/models/box.py` (add `last_seen`)
- Create: `backend/alembic/versions/7a82c478144b_add_last_seen_and_hardware_baseline.py`
- Modify: `backend/app/api/endpoints/provision.py` (add heartbeat endpoint)
- Modify: `backend/app/main.py` (add uvicorn startup heartbeat monitor task)
- Modify: `frontend/src/components/InventoryTab.tsx` (add online/offline indicator dot)

**Interfaces:**
- Produces: `POST /api/provision/{mac}/heartbeat` returning `{"status": "ok"}`
- Produces: `Box.last_seen` column in Database
- Produces: Background monitor function checking status of boxes

- [ ] **Step 1: Add `last_seen` column to Box model**
  In `backend/app/models/box.py`, add the `last_seen` field:
  ```python
  from sqlalchemy import Column, String, Enum, Text, Integer, ForeignKey, JSON, DateTime
  # ...
  class Box(Base):
      # ...
      installation_progress = Column(Integer, default=0, nullable=False)
      hardware_inventory = Column(JSON, nullable=True)
      hardware_baseline = Column(JSON, nullable=True) # Adding this now for Task 2
      last_seen = Column(DateTime, nullable=True)     # Added for Task 1
  ```

- [ ] **Step 2: Generate and apply Alembic migration**
  Create migration file:
  ```bash
  docker compose exec overwatch-core alembic revision --autogenerate -m "add_last_seen_and_hardware_baseline"
  ```
  Apply it:
  ```bash
  docker compose exec overwatch-core alembic upgrade head
  ```

- [ ] **Step 3: Implement heartbeat endpoint**
  At the end of `backend/app/api/endpoints/provision.py`, add:
  ```python
  from sqlalchemy.sql import func

  @router.post("/{mac}/heartbeat")
  async def box_heartbeat(mac: str, db: AsyncSession = Depends(get_db)):
      """Receive heartbeat tick from active boxes."""
      result = await db.execute(select(Box).where(Box.mac_address == cast(mac, MACADDR)))
      box = result.scalars().first()
      if not box:
          raise HTTPException(status_code=404, detail="Box not found")
      
      box.last_seen = func.now()
      await db.commit()
      return {"status": "ok"}
  ```

- [ ] **Step 4: Create background monitor task**
  In `backend/app/main.py`, run a background task at startup:
  ```python
  import asyncio
  from datetime import datetime, timedelta
  from sqlalchemy import select
  from app.db.session import AsyncSessionLocal
  from app.models.box import Box, BoxStatus
  from app.services.telegram import send_telegram_message

  async def monitor_heartbeats():
      while True:
          await asyncio.sleep(60)
          try:
              async with AsyncSessionLocal() as db:
                  threshold = datetime.utcnow() - timedelta(minutes=5)
                  # Find ACTIVE boxes that haven't sent a heartbeat for 5+ minutes, and were previously seen
                  result = await db.execute(
                      select(Box).where(
                          Box.status == BoxStatus.ACTIVE,
                          Box.last_seen < threshold
                      )
                  )
                  offline_boxes = result.scalars().all()
                  for box in offline_boxes:
                      # Switch status to MAINTENANCE (offline)
                      box.status = BoxStatus.MAINTENANCE
                      db.add(box)
                      
                      # Send alert
                      msg = f"⚠️ <b>Box Connection Alert</b>\n\nBox {box.internal_sn} ({box.mac_address}) went offline!\nLast seen: {box.last_seen}"
                      await send_telegram_message(db, msg)
                  if offline_boxes:
                      await db.commit()
          except Exception as e:
              import sys
              print(f"Error in monitor_heartbeats: {e}", file=sys.stderr)

  @app.on_event("startup")
  async def startup_event():
      asyncio.create_task(monitor_heartbeats())
  ```

- [ ] **Step 5: Render online/offline indicator dot in Frontend**
  In `frontend/src/components/InventoryTab.tsx`, update box model interface to include `last_seen` (string) and update table row rendering:
  ```typescript
  interface Box {
    id: string;
    // ...
    last_seen: string | null;
  }
  ```
  Inside the table row list where `box.internal_sn` is displayed, add an online/offline status dot:
  ```tsx
  const isOnline = (box: Box) => {
    if (!box.last_seen) return false;
    const diff = (new Date().getTime() - new Date(box.last_seen).getTime()) / 1000;
    return diff < 300; // 5 minutes
  };

  // In box.internal_sn table cell:
  <td className="px-6 py-4 font-bold text-zinc-200">
    <div className="flex items-center gap-2">
      <span 
        className={`w-2 h-2 rounded-full shrink-0 ${isOnline(box) ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-650'}`}
        title={box.last_seen ? `Last seen: ${new Date(box.last_seen).toLocaleString()}` : 'Never seen'}
      />
      <span>{box.internal_sn}</span>
    </div>
  </td>
  ```

- [ ] **Step 6: Verify frontend and backend build**
  ```bash
  docker compose exec overwatch-web npm run build
  docker compose restart overwatch-core
  ```
  Expected: Builds and starts successfully.

- [ ] **Step 7: Commit**
  ```bash
  git add backend/app/models/box.py backend/app/api/endpoints/provision.py backend/app/main.py frontend/src/components/InventoryTab.tsx
  git commit -m "feat: add heartbeat check daemon, last_seen monitoring, and online indicator dot"
  ```

---

### Task 2: Hardware Audit & Baseline Mismatch Alerting

**Files:**
- Modify: `backend/app/api/endpoints/provision.py` (add compare logic)
- Modify: `backend/app/schemas/box.py` (ensure `hardware_baseline` is in BoxResponse schema)

**Interfaces:**
- Produces: Mismatch check during `POST /api/provision/{mac}/hardware-inventory`

- [ ] **Step 1: Implement hardware baseline saving and comparison engine**
  In `backend/app/api/endpoints/provision.py`, update `report_hardware_inventory`:
  ```python
  def check_hardware_discrepancies(baseline: dict, current: dict) -> list[str]:
      discrepancies = []
      
      # 1. PCI Devices
      baseline_pci = set(p.strip() for p in baseline.get("pci_devices", "").split(";") if p.strip())
      current_pci = set(p.strip() for p in current.get("pci_devices", "").split(";") if p.strip())
      missing_pci = baseline_pci - current_pci
      for p in missing_pci:
          discrepancies.append(f"Missing PCI Device: {p}")
          
      # 2. USB Devices
      baseline_usb = set(u.strip() for u in baseline.get("usb_devices", "").split(",") if u.strip())
      current_usb = set(u.strip() for u in current.get("usb_devices", "").split(",") if u.strip())
      missing_usb = baseline_usb - current_usb
      for u in missing_usb:
          discrepancies.append(f"Missing USB Device: {u}")
          
      # 3. Serial Ports
      baseline_serial = set(s.strip() for s in baseline.get("serial_ports", "").split(",") if s.strip())
      current_serial = set(s.strip() for s in current.get("serial_ports", "").split(",") if s.strip())
      missing_serial = baseline_serial - current_serial
      for s in missing_serial:
          discrepancies.append(f"Missing Serial Port: {s}")
          
      # 4. Network Interfaces
      baseline_ifs = set(i.split("(")[0].strip() for i in baseline.get("interfaces", "").split(",") if i.strip())
      current_ifs = set(i.split("(")[0].strip() for i in current.get("interfaces", "").split(",") if i.strip())
      missing_ifs = baseline_ifs - current_ifs
      for i in missing_ifs:
          discrepancies.append(f"Missing Network Interface: {i}")

      return discrepancies

  @router.post("/{mac}/hardware-inventory")
  async def report_hardware_inventory(
      mac: str,
      payload: HardwareReport,
      db: AsyncSession = Depends(get_db)
  ):
      """Stores the hardware report and checks it against baseline for discrepancies."""
      result = await db.execute(select(Box).where(Box.mac_address == cast(mac, MACADDR)))
      box = result.scalars().first()
      if not box:
          raise HTTPException(status_code=404, detail="Box not found")

      current_inv = payload.model_dump(exclude_none=True)
      box.hardware_inventory = current_inv

      # If no baseline is set, make this the baseline
      if not box.hardware_baseline:
          box.hardware_baseline = current_inv
      else:
          # Verify current inventory matches baseline
          mismatches = check_hardware_discrepancies(box.hardware_baseline, current_inv)
          if mismatches:
              box.status = BoxStatus.MAINTENANCE
              mismatch_text = "\n".join(f"• {m}" for m in mismatches)
              msg = f"⚠️ <b>Hardware Discrepancy Alert for Box {box.internal_sn}</b>\n\nThe following items are missing:\n{mismatch_text}"
              await send_telegram_message(db, msg)

      await db.commit()
      return {"status": "ok"}
  ```

- [ ] **Step 2: Add script configuration for box cron heartbeat and inventory check**
  In `backend/app/api/endpoints/provision.py` `/init.sh` route generator:
  ```python
  # Add heartbeat cron-job setup to final init.sh execution
  script_content += f"""
  # --- Setup cron watchdog heartbeat ---
  echo "[Info] Setting up heartbeat cron job..."
  (crontab -l 2>/dev/null; echo "* * * * * curl -sf -X POST http://{api_host}:{api_port}/api/provision/{mac}/heartbeat || true") | sort -u | crontab -
  """
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add backend/app/api/endpoints/provision.py
  git commit -m "feat: implement hardware baseline comparison engine and Telegram notifications"
  ```

---

### Task 3: ProxyDHCP Toggle & Configurable DHCP settings

**Files:**
- Modify: `backend/app/api/endpoints/system.py` (save settings logic)
- Modify: `docker/infra/entrypoint.sh` (add watch loop reload)
- Modify: `frontend/src/components/SettingsTab.tsx` (add settings panel inputs)

**Interfaces:**
- Produces: dynamic `dnsmasq.conf` generation based on system settings

- [ ] **Step 1: Modify backend Settings endpoint to generate `dnsmasq.conf`**
  In `backend/app/api/endpoints/system.py`, import setting functions and update the save endpoint:
  ```python
  import aiofiles

  async def regenerate_dnsmasq_conf(db: AsyncSession):
      from app.api.endpoints.provision import get_system_setting
      
      mode = await get_system_setting(db, "DHCP_MODE", "full")
      interface = await get_system_setting(db, "DHCP_INTERFACE", "enp88s0")
      range_start = await get_system_setting(db, "DHCP_RANGE_START", "192.168.222.100")
      range_end = await get_system_setting(db, "DHCP_RANGE_END", "192.168.222.200")
      netmask = await get_system_setting(db, "DHCP_NETMASK", "255.255.255.0")
      gateway = await get_system_setting(db, "DHCP_ROUTER", "192.168.222.1")
      dns = await get_system_setting(db, "DHCP_DNS", "192.168.222.1")
      api_host = await get_system_setting(db, "API_HOST", "192.168.222.2")
      api_port = await get_system_setting(db, "API_PORT", "7000")

      lines = [
          "port=0",
          "enable-tftp",
          "tftp-root=/mnt/infra_config/tftp",
          "tftp-lowercase",
          f"interface={interface}",
          "bind-dynamic",
      ]

      if mode == "proxy":
          # Derive proxy subnet range (e.g. 192.168.222.0)
          subnet = ".".join(range_start.split(".")[:-1]) + ".0"
          lines.append(f"dhcp-range={subnet},proxy")
      else:
          lines.append(f"dhcp-range={range_start},{range_end},{netmask},12h")
          lines.append(f"dhcp-option=option:router,{gateway}")
          lines.append(f"dhcp-option=option:dns-server,{dns}")

      lines.extend([
          "dhcp-match=set:ipxe,175",
          f"dhcp-boot=tag:ipxe,http://{api_host}:{api_port}/api/provision/boot.ipxe",
          "dhcp-boot=tag:!ipxe,ipxe.efi",
          "log-dhcp",
          "log-queries",
          "log-facility=-"
      ])

      conf_path = "/mnt/infra_config/dnsmasq.conf"
      async with aiofiles.open(conf_path, "w") as f:
          await f.write("\n".join(lines))

  # In system settings save endpoint (e.g. POST /api/system/settings):
  # After saving all parameters:
  await regenerate_dnsmasq_conf(db)
  ```

- [ ] **Step 2: Update entrypoint script of infra container to watch file changes**
  Replace contents of `docker/infra/entrypoint.sh`:
  ```bash
  #!/bin/bash
  set -e

  echo "Syncing PXE boot files..."
  cp -rn /tftpboot/* /mnt/infra_config/tftp/

  mkdir -p /tftpboot/boot/grub
  mkdir -p /tftpboot/grub
  cp /usr/lib/grub/x86_64-efi-signed/grubnetx64.efi.signed /tftpboot/grubx64.efi

  # If not present in config directory, copy initial config there
  if [ ! -f /mnt/infra_config/dnsmasq.conf ]; then
      cp /etc/dnsmasq.conf /mnt/infra_config/dnsmasq.conf
  fi

  # Start md5 verification loop to automatically restart dnsmasq on configuration edits
  (
    LAST_MD5=""
    while true; do
      if [ -f /mnt/infra_config/dnsmasq.conf ]; then
        CURRENT_MD5=$(md5sum /mnt/infra_config/dnsmasq.conf | cut -d' ' -f1)
        if [ "$CURRENT_MD5" != "$LAST_MD5" ]; then
          if [ -n "$LAST_MD5" ]; then
            echo "[Infra] dnsmasq.conf updated. Reloading dnsmasq..."
            killall dnsmasq || true
            sleep 1
            dnsmasq --conf-file=/mnt/infra_config/dnsmasq.conf --log-dhcp --no-daemon &
          fi
          LAST_MD5=$CURRENT_MD5
        fi
      fi
      sleep 3
    done
  ) &

  dnsmasq --conf-file=/mnt/infra_config/dnsmasq.conf --log-dhcp --no-daemon &
  nginx -g "daemon off;"
  ```

- [ ] **Step 3: Rebuild the infra container**
  ```bash
  docker compose build overwatch-infra
  docker compose restart overwatch-infra
  ```

- [ ] **Step 4: Update SettingsTab frontend to manage DHCP config**
  In `frontend/src/components/SettingsTab.tsx`, add new form inputs for DHCP under the System Preferences sub-tab (or as a separate card):
  ```tsx
  // Add translations for settings fields
  // In SettingsTab:
  const dhcpMode = getSetting('DHCP_MODE', 'full');
  
  // Under the existing forms in system tab:
  <div className="pt-3 border-t border-zinc-850 space-y-4">
    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">DHCP Server Configuration</span>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DHCP Mode</label>
        <select
          value={getSetting('DHCP_MODE', 'full')}
          onChange={(e) => updateSettingValue('DHCP_MODE', e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none cursor-pointer"
        >
          <option value="full">Full DHCP Server (Overwatch leases IPs)</option>
          <option value="proxy">Proxy DHCP (Co-exists with existing router)</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DHCP Network Interface</label>
        <input
          type="text"
          value={getSetting('DHCP_INTERFACE', 'enp88s0')}
          onChange={(e) => updateSettingValue('DHCP_INTERFACE', e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
          placeholder="e.g. enp88s0"
        />
      </div>
    </div>

    {dhcpMode === 'full' && (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DHCP Pool Start</label>
            <input
              type="text"
              value={getSetting('DHCP_RANGE_START', '192.168.222.100')}
              onChange={(e) => updateSettingValue('DHCP_RANGE_START', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DHCP Pool End</label>
            <input
              type="text"
              value={getSetting('DHCP_RANGE_END', '192.168.222.200')}
              onChange={(e) => updateSettingValue('DHCP_RANGE_END', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DHCP Netmask</label>
            <input
              type="text"
              value={getSetting('DHCP_NETMASK', '255.255.255.0')}
              onChange={(e) => updateSettingValue('DHCP_NETMASK', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DHCP Gateway</label>
            <input
              type="text"
              value={getSetting('DHCP_ROUTER', '192.168.222.1')}
              onChange={(e) => updateSettingValue('DHCP_ROUTER', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">DHCP DNS</label>
            <input
              type="text"
              value={getSetting('DHCP_DNS', '192.168.222.1')}
              onChange={(e) => updateSettingValue('DHCP_DNS', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 p-2.5 rounded-lg outline-none font-mono"
            />
          </div>
        </div>
      </>
    )}
  </div>
  ```

- [ ] **Step 5: Verify build**
  ```bash
  docker compose exec overwatch-web npm run build
  docker compose restart overwatch-core
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add backend/app/api/endpoints/system.py docker/infra/entrypoint.sh frontend/src/components/SettingsTab.tsx
  git commit -m "feat: add dynamic dnsmasq configuration and ProxyDHCP toggle mode settings UI"
  ```
