from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.box import Box as BoxModel
from app.schemas.box import Box, BoxCreate, BoxUpdate

router = APIRouter()

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Total boxes
    result_total = await db.execute(select(BoxModel))
    total_boxes = len(result_total.scalars().all())

    # Pending Provision (NEW or STAGING)
    result_pending = await db.execute(select(BoxModel).where(BoxModel.status.in_(["NEW", "STAGING"])))
    pending_provision = len(result_pending.scalars().all())

    # Active Alerts (Dummy for now, maybe maintenance)
    result_alerts = await db.execute(select(BoxModel).where(BoxModel.status == "MAINTENANCE"))
    active_alerts = len(result_alerts.scalars().all())

    return {
        "total_boxes": total_boxes,
        "pending_provision": pending_provision,
        "active_alerts": active_alerts
    }

@router.get("/", response_model=List[Box])
async def read_boxes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BoxModel).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=Box)
async def create_box(box: BoxCreate, db: AsyncSession = Depends(get_db)):
    db_box = BoxModel(**box.model_dump())
    db.add(db_box)
    await db.commit()
    await db.refresh(db_box)
    return db_box

@router.get("/{box_id}", response_model=Box)
async def read_box(box_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BoxModel).where(BoxModel.id == box_id))
    box = result.scalars().first()
    if box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    return box

@router.put("/{box_id}", response_model=Box)
async def update_box(box_id: UUID, box_in: BoxUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BoxModel).where(BoxModel.id == box_id))
    box = result.scalars().first()
    if box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    
    update_data = box_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(box, field, value)
    
    await db.commit()
    await db.refresh(box)
    return box
