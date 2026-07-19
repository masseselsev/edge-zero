# Specifications: Orchestrator Enhancements (Heartbeat, Hardware Audit, ProxyDHCP)

This specification details three new enhancements for the Edge Z.E.R.O. provisioning orchestrator.

---

## 1. Heartbeat & Online/Offline Monitoring

### Goal
Provide real-time monitoring of active boxes so administrators can see if a provisioned box is online or has gone offline.

### Proposed Changes
1. **Database Schema:**
   * Add `last_seen` (`DateTime`, nullable) to the `Box` model.
2. **API Endpoints:**
   * `POST /api/provision/{mac}/heartbeat`: Anonymous endpoint called by active boxes. Updates `last_seen` and returns `{"status": "ok"}`.
3. **Background Daemon (Uvicorn Startup Task):**
   * Run a background loop (`asyncio.create_task`) checking every 60 seconds.
   * If a box has status `ACTIVE` and `last_seen` is older than 5 minutes, update status to `OFFLINE` (we can define a new status `OFFLINE` in `BoxStatus` or treat it as an active state flag. Let's add `OFFLINE` to `BoxStatus` or keep the status field simple).
   * Send a Telegram notification: `⚠️ Box {sn} has gone OFFLINE (last seen: {time})`.
4. **Box Agent Cron Script:**
   * An init-script or late-command appends a cron job on the box running every minute:
     ```bash
     * * * * * curl -sf -X POST http://<orchestrator-ip>:<port>/api/provision/<mac>/heartbeat || true
     ```

---

## 2. Hardware Audit & Baseline Verification

### Goal
Detect when a box's physical equipment (PCI capture cards, USB controllers, COM ports, memory) changes or gets disconnected.

### Proposed Changes
1. **Database Schema:**
   * Add `hardware_baseline` (`JSON`, nullable) to the `Box` model.
2. **API Logic:**
   * In `POST /api/provision/{mac}/hardware-inventory`:
     * If `hardware_baseline` is empty/null, populate it with the incoming report (acts as the registration baseline).
     * On subsequent boots or manual inspections, compare the new `hardware_inventory` with `hardware_baseline`.
   * **Comparison Engine:**
     * Compare hardware categories: `cpu`, `memory`, `disk`, `interfaces`, `usb_devices`, `pci_devices`, `serial_ports`.
     * Focus on **subtractions**: check if devices present in the baseline are missing from the current report.
     * Ignore minor variable shifts (e.g. slight memory availability delta).
   * **Alerting:**
     * If a mismatch/missing hardware is detected, set box status to `MAINTENANCE`.
     * Save a log entry in `system_logs`/`provisioning_logs`.
     * Send a detailed Telegram notification listing the missing devices.

---

## 3. ProxyDHCP & Configurable DHCP settings

### Goal
Allow the orchestrator to run alongside existing DHCP servers (like Mikrotik) without IP conflicts, and manage DHCP options directly from the settings panel.

### Proposed Changes
1. **System Settings:**
   * Introduce settings in `SystemSettings` table:
     * `DHCP_MODE` (`"full"` or `"proxy"`, default `"full"`)
     * `DHCP_INTERFACE` (default `"enp88s0"`)
     * `DHCP_RANGE_START` (default `"192.168.222.100"`)
     * `DHCP_RANGE_END` (default `"192.168.222.200"`)
     * `DHCP_NETMASK` (default `"255.255.255.0"`)
     * `DHCP_ROUTER` (default `"192.168.222.1"`)
     * `DHCP_DNS` (default `"192.168.222.1"`)
2. **Dynamic `dnsmasq.conf` Generation:**
   * When saving settings on the backend:
     * Generate `dnsmasq.conf` template.
     * Write it to `/mnt/infra_config/dnsmasq.conf`.
3. **Self-Reloading Daemon in Infra Container:**
   * Update the infra container entrypoint to run a lightweight MD5-checksum watcher loop.
   * If `/mnt/infra_config/dnsmasq.conf` changes, reload dnsmasq instantly.
4. **UI Settings Tab:**
   * Add a new section **DHCP Server Configuration** in Settings.
   * Allow toggling between Full and Proxy modes with conditional field inputs.
