"""
SSH WebSocket Proxy

Exposes: WS /api/ssh/{box_id}?token=<jwt>

Flow:
  Browser (xterm.js)
    ↕ WebSocket (binary frames)
  FastAPI WebSocket handler
    ↕ asyncssh SSHClientSession
  Box SSH daemon

Auth: JWT token passed as ?token= query parameter (Bearer tokens can't be
set as WS headers from browsers, so query param is the standard workaround).
"""

import asyncio
import logging
from uuid import UUID

import asyncssh
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.box import Box, BoxStatus
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


async def _validate_token(token: str) -> bool:
    """Validate JWT token, return True if valid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return False
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.username == username))
            return result.scalars().first() is not None
    except JWTError:
        return False


class _WebSocketSSHSession(asyncssh.SSHClientSession):
    """Routes SSH stdout/stderr data back to the WebSocket."""

    def __init__(self, ws: WebSocket):
        self._ws = ws

    def data_received(self, data: str, datatype) -> None:
        asyncio.ensure_future(self._ws.send_text(data))

    def connection_lost(self, exc: Exception | None) -> None:
        if exc:
            logger.warning("SSH connection lost: %s", exc)


@router.websocket("/{box_id}")
async def ssh_proxy(
    websocket: WebSocket,
    box_id: UUID,
    token: str = Query(...),
):
    """
    WebSocket endpoint that proxies an interactive SSH session to a box.
    Only accessible for ACTIVE or MAINTENANCE boxes.
    """
    # 1. Validate JWT before accepting connection
    if not await _validate_token(token):
        await websocket.close(code=4401)
        return

    # 2. Fetch box
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Box).where(Box.id == box_id))
        box = result.scalars().first()

    if not box:
        await websocket.close(code=4404)
        return

    if box.status not in (BoxStatus.ACTIVE, BoxStatus.MAINTENANCE):
        await websocket.close(code=4403)
        return

    host = str(box.ip_address)
    port = box.ssh_port or 22
    username = box.ssh_username or "root"
    password = box.ssh_password or ""

    await websocket.accept()

    # 3. Connect via asyncssh
    ssh_conn: asyncssh.SSHClientConnection | None = None
    channel = None
    try:
        ssh_conn = await asyncssh.connect(
            host,
            port=port,
            username=username,
            password=password,
            known_hosts=None,          # Don't verify host keys in this context
            encoding=None,             # Raw bytes mode
        )
        channel, _ = await ssh_conn.create_session(
            lambda: _WebSocketSSHSession(websocket),
            term_type="xterm-256color",
            term_size=(220, 50),
        )
    except (asyncssh.Error, OSError) as exc:
        logger.error("SSH connect failed for box %s (%s:%d): %s", box_id, host, port, exc)
        try:
            await websocket.send_text(f"\r\n\x1b[31m[SSH Error] {exc}\x1b[0m\r\n")
            await websocket.close()
        except Exception:
            pass
        return

    # 4. Relay WebSocket → SSH stdin
    try:
        while True:
            data = await websocket.receive_bytes()
            if channel:
                channel.write(data)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("SSH proxy loop ended: %s", exc)
    finally:
        if channel:
            try:
                channel.close()
            except Exception:
                pass
        if ssh_conn:
            ssh_conn.close()
