# Specification: Edge B.R.O. (Backup & Restore Orchestrator) Integration

This specification details the design for integrating the Edge Z.E.R.O. provisioning hub (Overwatch) with the Edge B.R.O. backup system as a test feature tab.

---

## 1. System Settings additions
We will add settings keys to the `system_settings` table to handle Edge B.R.O. connection details:
- `EDGE_BRO_URL`: The URL to reach the Edge B.R.O. backend (default: `"http://localhost:8000"`).
- `EDGE_BRO_USER`: The admin user login on Edge B.R.O. (default: `"admin"`).
- `EDGE_BRO_PASSWORD`: The admin user password on Edge B.R.O. (default: `"admin"`).

---

## 2. Backend Sync API Endpoints
We will add a new API router in Overwatch `/api/system/edge-bro` (in `backend/app/api/endpoints/system.py` or a dedicated file):

### `GET /api/system/edge-bro/status`
* **Flow:**
  1. Retrieve connection parameters from settings.
  2. Perform `POST /api/auth/login` to Edge B.R.O. using the credentials to obtain a JWT token.
  3. Fetch the list of registered nodes from Edge B.R.O. via `GET /api/nodes?limit=1000`.
  4. Query active boxes (status `ACTIVE` or `MAINTENANCE`) in Overwatch.
  5. Match nodes on both servers by matching the box `internal_sn` with the Edge B.R.O. node `hostname`.
  6. Return a merged list of boxes including:
     - `id` (Overwatch UUID)
     - `internal_sn` (Serial Number)
     - `mac_address`
     - `ip_address`
     - `ssh_username`, `ssh_password`, `ssh_port`
     - `overwatch_status`
     - `edge_bro_status`: `"NOT_REGISTERED"`, or the actual status from B.R.O. (`"NEEDS_BOOTSTRAP"`, `"READY"`, `"OFFLINE"`, etc.).
     - `edge_bro_id` (node ID in B.R.O. if registered).

### `POST /api/system/edge-bro/sync`
* **Request Schema:**
  ```json
  {
    "box_ids": ["uuid-1", "uuid-2"]
  }
  ```
* **Flow:**
  1. Fetch B.R.O. credentials and log in to get a JWT token.
  2. For each box ID:
     - Fetch the Box configuration in Overwatch.
     - Call `POST /api/nodes` on Edge B.R.O. to register the node.
       Payload:
       ```json
       {
         "hostname": box.internal_sn,
         "ip_address": box.ip_address,
         "ssh_port": box.ssh_port,
         "bootstrap_user": box.ssh_username,
         "bootstrap_password": box.ssh_password,
         "auto_detect_hostname": false
       }
       ```
  3. Return a summary dictionary showing success or details of failures.

---

## 3. Frontend "Edge B.R.O." Tab
We will implement `frontend/src/components/EdgeBroTab.tsx` containing:
- **Connection Status Widget:** Indicator displaying whether the Edge B.R.O. server is reachable or disconnected.
- **Header Actions:** "Sync All Unregistered" button to register all eligible boxes in one click.
- **Node Matrix List:** Table displaying:
  - Box Serial Number (`internal_sn`)
  - MAC Address
  - IP Address
  - Current Status in Overwatch
  - Status in Edge B.R.O. (with colored status pills matching Edge B.R.O. style: `READY` -> Green, `NEEDS_BOOTSTRAP` -> Blue, `OFFLINE` -> Grey, `NOT_REGISTERED` -> Orange).
  - Sync Action Button (Visible for unregistered boxes, showing a cloud-upload icon).

---

## 4. Translation Keys
We will register translation strings for all statuses, alerts, buttons, and titles in `translations.ts` in English, Russian, and Ukrainian.
