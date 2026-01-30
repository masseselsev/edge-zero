from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.location import Location as LocationModel
from app.schemas.location import Location, LocationCreate, LocationUpdate

router = APIRouter()

@router.get("/", response_model=List[Location])
async def read_locations(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LocationModel).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=Location)
async def create_location(location: LocationCreate, db: AsyncSession = Depends(get_db)):
    # Check if exists
    result = await db.execute(select(LocationModel).where(LocationModel.name == location.name))
    if result.scalars().first():
         raise HTTPException(status_code=400, detail="Location with this name already exists")

    db_obj = LocationModel(**location.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/{location_id}", response_model=Location)
async def update_location(location_id: UUID, location_in: LocationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LocationModel).where(LocationModel.id == location_id))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Location not found")
        
    for field, value in location_in.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)

    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.delete("/{location_id}")
async def delete_location(location_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LocationModel).where(LocationModel.id == location_id))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Location not found")
        
    await db.delete(db_obj)
    await db.commit()
    return {"status": "success"}
