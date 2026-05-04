from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import aiofiles
from uuid import UUID

from app.db.session import get_db
from app.models.init_script import InitScript
from pydantic import BaseModel

router = APIRouter()

SCRIPTS_DIR = "/mnt/infra_config/scripts"

class InitScriptResponse(BaseModel):
    id: UUID
    filename: str
    hardware_comment: str | None = None

    class Config:
        from_attributes = True

@router.on_event("startup")
async def startup_event():
    os.makedirs(SCRIPTS_DIR, exist_ok=True)

@router.post("/", response_model=InitScriptResponse)
async def upload_init_script(
    file: UploadFile = File(...),
    hardware_comment: str = Form(None),
    db: AsyncSession = Depends(get_db)
):
    # Ensure safe filename
    filename = file.filename.replace(" ", "_")
    filepath = os.path.join(SCRIPTS_DIR, filename)
    
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
        
    db_script = InitScript(filename=filename, hardware_comment=hardware_comment)
    db.add(db_script)
    await db.commit()
    await db.refresh(db_script)
    
    return db_script

@router.get("/", response_model=List[InitScriptResponse])
async def list_init_scripts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InitScript))
    return result.scalars().all()

@router.delete("/{script_id}")
async def delete_init_script(script_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InitScript).where(InitScript.id == script_id))
    script = result.scalars().first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
        
    filepath = os.path.join(SCRIPTS_DIR, script.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        
    await db.delete(script)
    await db.commit()
    return {"status": "success"}
