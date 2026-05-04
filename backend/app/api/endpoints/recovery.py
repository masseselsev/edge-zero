from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import datetime

from app.db.session import get_db
from app.models.user import User
from app.services.telegram import send_telegram_message
from pydantic import BaseModel
from app.core import security

router = APIRouter()

class RecoveryRequest(BaseModel):
    username: str

class PasswordReset(BaseModel):
    username: str
    token: str
    new_password: str

# In-memory store for recovery tokens (MVP). For production, use DB or Redis.
recovery_tokens = {}

@router.post("/request")
async def request_recovery(data: RecoveryRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalars().first()
    
    if not user or not user.telegram_id:
        # Return success anyway to prevent username enumeration
        return {"status": "success", "message": "If the user exists and has a Telegram ID, a recovery link has been sent."}
        
    token = str(uuid.uuid4())
    recovery_tokens[data.username] = {
        "token": token,
        "expires": datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    }
    
    message = f"Password recovery requested for <b>{user.username}</b>.\n\nYour recovery token is: <code>{token}</code>\nThis token expires in 15 minutes."
    await send_telegram_message(db, message, chat_id=user.telegram_id)
    
    return {"status": "success", "message": "If the user exists and has a Telegram ID, a recovery link has been sent."}

@router.post("/reset")
async def reset_password(data: PasswordReset, db: AsyncSession = Depends(get_db)):
    stored = recovery_tokens.get(data.username)
    if not stored or stored["token"] != data.token:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    if datetime.datetime.utcnow() > stored["expires"]:
        del recovery_tokens[data.username]
        raise HTTPException(status_code=400, detail="Token expired")
        
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = security.get_password_hash(data.new_password)
    await db.commit()
    
    del recovery_tokens[data.username]
    return {"status": "success", "message": "Password successfully reset"}
