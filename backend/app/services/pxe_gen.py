import os
import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.box import Box, BoxStatus
from app.core.config import settings

INFRA_CONFIG_DIR = "/mnt/infra_config"
DNSMASQ_ETHERS_FILE = os.path.join(INFRA_CONFIG_DIR, "dnsmasq.ethers")
TFTP_ROOT = os.path.join(INFRA_CONFIG_DIR, "tftp")
PXE_CFG_DIR = os.path.join(TFTP_ROOT, "pxelinux.cfg")

async def generate_pxe_config(db: AsyncSession):
    """
    Generates dnsmasq.ethers and pxelinux.cfg files based on active boxes.
    """
    # Ensure directories exist
    os.makedirs(PXE_CFG_DIR, exist_ok=True)
    
    # Query all boxes with assigned IPs
    result = await db.execute(select(Box).where(Box.ip_address.is_not(None)))
    boxes = result.scalars().all()

    # 1. Generate dnsmasq.ethers
    ethers_content = []
    for box in boxes:
        # Format: MAC,IP
        if box.mac_address and box.ip_address:
            ethers_content.append(f"{box.mac_address},{box.ip_address}")
    
    async with aiofiles.open(DNSMASQ_ETHERS_FILE, "w") as f:
        await f.write("\n".join(ethers_content))

    # 2. Generate pxelinux.cfg files for each box
    for box in boxes:
        await generate_box_pxe_config(box)

async def generate_box_pxe_config(box: Box):
    """
    Generates a specific pxelinux config file for a box.
    Filename should be 01-mac-address-lowercase-dash-separated.
    """
    if not box.mac_address:
        return

    # MAC to pxe config filename: 01-aa-bb-cc-dd-ee-ff
    mac_str = str(box.mac_address).lower().replace(":", "-")
    filename = f"01-{mac_str}"
    filepath = os.path.join(PXE_CFG_DIR, filename)

    config_content = ""
    
    if box.status == BoxStatus.INSTALLING:
        # PXE Boot for Installation
        # Kernel parameters should point to our preseed URL
        preseed_url = f"http://{settings.API_HOST}:{settings.API_PORT}/api/provision/{box.mac_address}/preseed.cfg"
        # Assuming we have a standard debian installer kernel/initrd text.cfg
        # This implementation requires the actual kernel/initrd files to be present in TFTP root.
        
        config_content = f"""
DEFAULT install
LABEL install
    KERNEL debian-installer/linux
    APPEND initrd=debian-installer/initrd.gz auto=true priority=critical url={preseed_url} interface=auto
"""
    else:
        # Boot from local disk
        config_content = """
DEFAULT local
LABEL local
    LOCALBOOT 0
"""

    async with aiofiles.open(filepath, "w") as f:
        await f.write(config_content)
