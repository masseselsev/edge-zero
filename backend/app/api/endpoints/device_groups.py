from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.device_group import DeviceGroup as DeviceGroupModel
from app.schemas.device_group import DeviceGroup, DeviceGroupCreate

router = APIRouter()

@router.get("/", response_model=List[DeviceGroup])
async def read_device_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DeviceGroupModel))
    return result.scalars().all()

@router.post("/", response_model=DeviceGroup)
async def create_device_group(group: DeviceGroupCreate, db: AsyncSession = Depends(get_db)):
    # Check exists
    result = await db.execute(select(DeviceGroupModel).where(DeviceGroupModel.name == group.name))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Device Group already exists")
    
    db_group = DeviceGroupModel(name=group.name, description=group.description)
    db.add(db_group)
    await db.commit()
    await db.refresh(db_group)
    return db_group

@router.delete("/{group_id}")
async def delete_device_group(group_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DeviceGroupModel).where(DeviceGroupModel.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Device Group not found")
        
    await db.delete(group)
    await db.commit()
    return {"status": "deleted"}
