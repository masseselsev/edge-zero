from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from typing import List
from pydantic import BaseModel

from app.db.session import get_db
from app.models.system_settings import SystemSettings

router = APIRouter()

class SettingItem(BaseModel):
    key: str
    value: str

@router.get("/status")
async def get_system_status(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "online", "database": "connected"}
    except Exception as e:
        return {"status": "offline", "database": "disconnected", "detail": str(e)}

@router.get("/settings", response_model=List[SettingItem])
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings))
    return result.scalars().all()

@router.post("/settings")
async def update_settings(settings_list: List[SettingItem], db: AsyncSession = Depends(get_db)):
    for item in settings_list:
        result = await db.execute(select(SystemSettings).where(SystemSettings.key == item.key))
        setting = result.scalars().first()
        if setting:
            setting.value = item.value
        else:
            new_setting = SystemSettings(key=item.key, value=item.value)
            db.add(new_setting)
    await db.commit()
    return {"status": "success"}
