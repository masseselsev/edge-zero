from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.templating import Jinja2Templates
from fastapi.responses import Response

from app.db.session import get_db
from app.models.box import Box
from app.models.vpn_credential import VpnCredential

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

from app.services.pxe_gen import generate_pxe_config

@router.post("/sync")
async def sync_pxe_config(db: AsyncSession = Depends(get_db)):
    """
    Force regeneration of PXE/DNSMasq configs.
    """
    await generate_pxe_config(db)
    return {"status": "synced"}

from sqlalchemy import select, cast
from sqlalchemy.dialects.postgresql import MACADDR

# ...

@router.get("/{mac}/preseed.cfg")
async def get_preseed(mac: str, request: Request, db: AsyncSession = Depends(get_db)):
    # Standardize MAC format if needed. Assuming formatted as in DB or handled.
    # The prompt generator logic uses colon-separated? PXE asks for dash-separated usually, 
    # but the URL in PXE config uses `{mac}/preseed.cfg`.
    # Let's handle generic mac matching.
    
    # Query Box (cast input string to MACADDR)
    # Note: If mac string is invalid, this might raise DB error. 
    # Ideally validate before query. But for now, we rely on basic catch or 500.
    result = await db.execute(select(Box).where(Box.mac_address == cast(mac, MACADDR)))
    box = result.scalars().first()
    
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")

    # Get VPN Creds
    result_vpn = await db.execute(select(VpnCredential).where(VpnCredential.box_id == box.id))
    vpn = result_vpn.scalars().first()

    # Define variables for template
    context = {
        "request": request,
        "ip_address": box.ip_address,
        "gateway": "192.168.1.1", # Hardcoded for now, should be in SystemSettings or Subnet logic
        "dns": "8.8.8.8",
        "ssh_public_key": "ssh-rsa AAAA...", # Should come from SystemSettings
        "ca_cert": vpn.ca_cert if vpn else "",
        "client_cert": vpn.client_cert if vpn else "",
        "client_key": vpn.client_key if vpn else ""
    }
    
    if vpn:
        # Escape newlines for echo commands in preseed
        context["ca_cert"] = context["ca_cert"].replace("\n", "\\n")
        context["client_cert"] = context["client_cert"].replace("\n", "\\n")
        context["client_key"] = context["client_key"].replace("\n", "\\n")

    return templates.TemplateResponse(
        "preseed.j2", 
        context,
        media_type="text/plain"
    )
