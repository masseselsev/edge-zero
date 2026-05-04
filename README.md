# overwatch
Edge provisioning

## Features
- **Device Inventory**: Track devices with SN, MAC, IP.
- **Location Management**: Organize devices by physical location.
- **Batch Actions**: Provision, tag, or delete multiple devices at once.
- **Zero-Touch Provisioning**: Automated PXE boot and OS installation.
- **Telegram Integration**: Status updates and alerts.

## Getting Started

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

### Password Reset
If you lose access, you can reset the admin password to `admin123` by running:
```bash
docker compose exec overwatch-core python /app/create_admin.py
```

## Development
- **Backend API**: http://localhost:8000
- **Frontend App**: http://localhost:5173
