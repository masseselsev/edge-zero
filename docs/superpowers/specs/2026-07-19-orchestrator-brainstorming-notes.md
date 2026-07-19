# Orchestrator Architecture Brainstorming Notes & Roadmap

This document captures the brainstorming discussion, architectural designs, and implementation roadmap for the Edge Z.E.R.O. provisioning orchestrator.

## 1. Installation Progress & Real-Time Logs

### The Problem
When the administrator clicks "Provision", the box transitions to the `INSTALLING` status. However, there is no real-time progress indicator or installation logging visible in the UI. If a setup fails (e.g., partitioning errors or broken mirror download), it fails silently.

### The Solutions

#### Ubuntu Autoinstall (Subiquity)
Ubuntu's subiquity installer supports a native HTTP reporting mechanism. We can configure this in the `user-data` YAML template:
```yaml
reporting:
  orchestrator:
    type: http
    url: http://<orchestrator-ip>:<port>/api/provision/<mac>/report
```
Subiquity automatically sends structured POST JSON payloads on every major phase (e.g., partition, download, configure, packages, completed, failed).

#### Debian Installer (Preseed)
Debian's debian-installer doesn't have a direct equivalent of Subiquity reporting, but we can hook into:
1. **Syslog forwarding:** Configure `d-i syslog-preseed/syslog-server string <orchestrator-ip>`. The installer sends syslog logs over UDP to the orchestrator.
2. **HTTP hooks (`preseed/late_command` or step scripts):** We can inject tiny bash wrapper curls at key milestones (e.g., starting partitioning, finished base install, starting custom scripts) to log status.

---

## 2. Localization & Provision Profiles (Tashkent, Kiev, Montevideo)

### The Problem
Language, timezone, keymap, and interface name settings are currently hardcoded in templates. They must be configurable per physical location.

### The Solution
Implement **Provision Profiles** (or dynamic Location settings):
* Add fields to the Database/API for `Location` or `ProvisionProfile`:
  * Timezone (e.g., `Asia/Tashkent`, `Europe/Kyiv`, `America/Montevideo`)
  * System Locale (e.g., `en_US.UTF-8`, `ru_RU.UTF-8`)
  * Keyboard Layout (`us`, `ru`, etc.)
  * Local Package Mirror (speeding up local installs)
  * DNS & NTP Servers
* Update templates (`preseed.j2`, `user-data.j2`) to consume these variables dynamically.

---

## 3. Post-Install Hardware Inventory & Customization

### The Problem
The orchestrator needs to verify what physical equipment (COM ports, USB hubs, network interfaces, PCI capture cards) is connected to the box after the OS is installed.

### The Solution
Implement an **Inspection Script (Push Model)**:
* During the final step of `init.sh`, the box runs a hardware diagnostic script (`lspci`, `lsusb`, list serial TTY ports `/dev/ttyS*`, check network interface links).
* The script packages these diagnostics into a JSON payload and POSTs them to `/api/provision/<mac>/hardware-inventory`.
* The orchestrator displays this inventory in the dashboard under the box details.

---

## 4. Telegram Notifications

### The Problem
Telegram alerts are sent from a global token/chat ID configured in environment variables, lacking user-level granularity or menu configuration.

### The Solution
* Keep a global notification channel for system-wide failures.
* Integrate individual developer/employee chat subscriptions by saving the user's personal Telegram ID inside their profile.

---

## 5. Co-existence with Lab DHCP (Mikrotik)

### The Problem
Running `dnsmasq` as an active DHCP server on a lab network with an existing Mikrotik DHCP server causes address pool conflicts and lease chaos.

### The Solution: ProxyDHCP Mode
We configure `dnsmasq` to run in **ProxyDHCP** mode:
* The Mikrotik server continues to manage the network IP pool, leasing IP addresses, gateways, and DNS to all devices.
* `dnsmasq` does **not** assign IP addresses. It listens on port 4011 and responds *only* to PXE clients, providing the TFTP server IP and the path to the bootloader (`undionly.kpxe` / `ipxe.efi`).
* Once the Debian/Ubuntu OS is installed on the box, it stops requesting PXE boot and behaves like a normal network client, receiving its IP address from Mikrotik.
