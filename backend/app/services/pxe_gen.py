import os
import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.box import Box, BoxStatus
from app.core.config import settings

INFRA_CONFIG_DIR = "/mnt/infra_config"
DNSMASQ_ETHERS_FILE = os.path.join(INFRA_CONFIG_DIR, "dnsmasq.ethers")
TFTP_ROOT = os.path.join(INFRA_CONFIG_DIR, "tftp")
PXE_CFG_DIR = os.path.join(TFTP_ROOT, "pxelinux.cfg")
GRUB_CFG_DIR = os.path.join(TFTP_ROOT, "grub")

async def generate_pxe_config(db: AsyncSession):
    """
    Generates dnsmasq.ethers and pxelinux.cfg files based on active boxes.
    """
    # Ensure directories exist
    os.makedirs(PXE_CFG_DIR, exist_ok=True)
    os.makedirs(GRUB_CFG_DIR, exist_ok=True)
    
    # Query all boxes with MAC addresses and eagerly load OS Image
    result = await db.execute(
        select(Box)
        .options(selectinload(Box.os_image))
        .where(Box.mac_address.is_not(None))
    )
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
    
    # 3. Generate default config (Local Boot)
    default_filepath = os.path.join(PXE_CFG_DIR, "default")
    default_content = """
DEFAULT local
LABEL local
    LOCALBOOT 0
"""
    async with aiofiles.open(default_filepath, "w") as f:
        await f.write(default_content)

    # 4. Generate main GRUB config (UEFI)
    # It will try to load a mac-specific config
    main_grub_path = os.path.join(GRUB_CFG_DIR, "grub.cfg")
    main_grub_content = """
set timeout=1
set default=0

# Search for config by MAC (01-aa-bb-cc-dd-ee-ff)
# Note: net_default_mac is set by GRUB PXE
configfile /grub/grub.cfg-01-$net_default_mac
"""
    async with aiofiles.open(main_grub_path, "w") as f:
        await f.write(main_grub_content)

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
        preseed_url = f"http://{settings.API_HOST}:{settings.API_PORT}/api/provision/{box.mac_address}/preseed.cfg"
        
        # Default kernel/initrd
        kernel = "debian-installer/linux"
        initrd = "debian-installer/initrd.gz"
        
        # If box has a specific OS image, use it
        if box.os_image:
            # We assume extracted ISO contents are in tftp/images/{filename_without_ext}/
            image_dir = box.os_image.filename.replace(".iso", "").replace(".ISO", "")
            kernel = f"images/{image_dir}/vmlinuz"
            initrd = f"images/{image_dir}/initrd.gz"

        config_content = f"""
DEFAULT install
LABEL install
    KERNEL {kernel}
    APPEND initrd={initrd} auto=true priority=critical url={preseed_url} interface=auto
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
    
    # --- Generate GRUB (UEFI) counterpart ---
    grub_filename = f"grub.cfg-{filename}" # grub.cfg-01-aa-bb-cc-dd-ee-ff
    grub_filepath = os.path.join(GRUB_CFG_DIR, grub_filename)
    
    grub_content = ""
    if box.status == BoxStatus.INSTALLING:
        preseed_url = f"http://{settings.API_HOST}:{settings.API_PORT}/api/provision/{box.mac_address}/preseed.cfg"
        image_dir = box.os_image.filename.replace(".iso", "").replace(".ISO", "") if box.os_image else "debian-installer"
        kernel = f"/images/{image_dir}/vmlinuz"
        initrd = f"/images/{image_dir}/initrd.gz"
        
        grub_content = f"""
menuentry 'Install OS' {{
    linux {kernel} initrd={initrd} auto=true priority=critical url={preseed_url} interface=auto
    initrd {initrd}
}}
"""
    else:
        grub_content = """
menuentry 'Local Boot' {
    exit
}
"""
    async with aiofiles.open(grub_filepath, "w") as f:
        await f.write(grub_content)
