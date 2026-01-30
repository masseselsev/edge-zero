from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/status")
async def get_system_status(db: AsyncSession = Depends(get_db)):
    try:
        # Check database connection
        await db.execute(text("SELECT 1"))
        return {"status": "online", "database": "connected"}
    except Exception as e:
        # In a real scenario, you might want to log this error or return a 503
        # For the sidebar status, returning the specific error state is useful
        return {"status": "offline", "database": "disconnected", "detail": str(e)}
