import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.os_image import OsImage as OsImageModel
from app.models.system_settings import SystemSettings as SystemSettingsModel
from app.models.init_script import InitScript as InitScriptModel
from app.schemas.library import OsImage, OsImageCreate, SystemSetting, SystemSettingCreate, OsType, InitScript, InitScriptCreate

router = APIRouter()

# Constants
INFRA_CONFIG_DIR = "/mnt/infra_config"
ISO_DIR = os.path.join(INFRA_CONFIG_DIR, "isos")
SCRIPTS_DIR = os.path.join(INFRA_CONFIG_DIR, "scripts")

# Ensure dirs exist
os.makedirs(ISO_DIR, exist_ok=True)
os.makedirs(SCRIPTS_DIR, exist_ok=True)

# --- OS IMAGES ---

@router.get("/images", response_model=List[OsImage])
async def read_images(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OsImageModel))
    return result.scalars().all()

@router.post("/images", response_model=OsImage)
async def upload_image(
    file: UploadFile = File(...),
    os_type: OsType = Form(...),
    is_active: bool = Form(False),
    db: AsyncSession = Depends(get_db)
):
    # Save file to disk
    file_location = os.path.join(ISO_DIR, file.filename)
    
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        # Cleanup partial file
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Save to DB
    db_image = OsImageModel(
        filename=file.filename,
        os_type=os_type,
        is_active=is_active
    )
    
    if is_active:
        pass 

    db.add(db_image)
    try:
        await db.commit()
    except Exception as e:
         # Cleanup file if DB commit fails
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Database commit failed: {e}")
        
    await db.refresh(db_image)
    return db_image

@router.delete("/images/{image_id}")
async def delete_image(image_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OsImageModel).where(OsImageModel.id == image_id))
    image = result.scalars().first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Remove from disk
    file_path = os.path.join(ISO_DIR, image.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from DB
    await db.delete(image)
    await db.commit()
    return {"status": "deleted"}

# --- INIT SCRIPTS ---

@router.get("/scripts", response_model=List[InitScript])
async def read_scripts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InitScriptModel))
    return result.scalars().all()

@router.post("/scripts", response_model=InitScript)
async def upload_script(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Save file to disk
    file_location = os.path.join(SCRIPTS_DIR, file.filename)
    
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Save to DB
    db_script = InitScriptModel(filename=file.filename)
    db.add(db_script)
    try:
        await db.commit()
    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Database commit failed: {e}")

    await db.refresh(db_script)
    return db_script

@router.delete("/scripts/{script_id}")
async def delete_script(script_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InitScriptModel).where(InitScriptModel.id == script_id))
    script = result.scalars().first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Remove from disk
    file_path = os.path.join(SCRIPTS_DIR, script.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from DB
    await db.delete(script)
    await db.commit()
    return {"status": "deleted"}

# --- SYSTEM SETTINGS ---

@router.get("/settings", response_model=List[SystemSetting])
async def read_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettingsModel))
    return result.scalars().all()

@router.post("/settings", response_model=SystemSetting)
async def create_or_update_setting(setting: SystemSettingCreate, db: AsyncSession = Depends(get_db)):
    # Check if exists
    result = await db.execute(select(SystemSettingsModel).where(SystemSettingsModel.key == setting.key))
    existing = result.scalars().first()
    
    if existing:
        existing.value = setting.value
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        new_setting = SystemSettingsModel(key=setting.key, value=setting.value)
        db.add(new_setting)
        await db.commit()
        await db.refresh(new_setting)
        return new_setting
