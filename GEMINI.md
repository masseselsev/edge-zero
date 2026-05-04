# Overwatch Project Context

Overwatch is a provisioning and orchestration system for road video-recording boxes.

## Architecture
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL.
- **Frontend:** Vue 3, Vite, TailwindCSS.
- **Infrastructure:** Docker, Docker Compose.
- **Provisioning:** `dnsmasq` serves DHCP/TFTP for PXE booting. `preseed.cfg` is generated dynamically by the backend to install Debian. `late_command` executes post-install init scripts.

## Rules for AI Agents and Developers

> [!CAUTION]
> **STRICT FILE SIZE LIMIT**
> NO FILE in this repository should exceed **500-600 lines**. If a file grows beyond this limit, you MUST refactor it and extract components/functions into separate files. 

> [!IMPORTANT]
> **MAXIMUM ABSTRACTION**
> - **DRY (Don't Repeat Yourself):** Never repeat the same action in different places. If duplication occurs, extract the logic into a helper function or a service.
> - **Vue Components:** Keep components small, modular, and focused on a single responsibility.
> - **FastAPI Endpoints:** Keep route handlers thin. Move business logic to the `services/` directory.

## Current Workflow
1. Employee registers a Box (MAC, equipment, template).
2. The Box boots up and requests a DHCP lease. `dnsmasq` serves the PXE boot files.
3. The Box installs Debian using the dynamically generated `preseed.cfg` from the backend.
4. The `preseed.cfg` executes a `late_command` to download and run uploaded init-scripts based on the Box's hardware.
5. The Box sends a success callback to the backend.
6. The backend sends a Telegram notification to the employee.
