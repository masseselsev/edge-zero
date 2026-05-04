import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.system_settings import SystemSettings

async def get_telegram_config(db: AsyncSession):
    bot_token = await db.execute(select(SystemSettings).where(SystemSettings.key == "TELEGRAM_BOT_TOKEN"))
    chat_id = await db.execute(select(SystemSettings).where(SystemSettings.key == "TELEGRAM_CHAT_ID"))
    return bot_token.scalars().first(), chat_id.scalars().first()

async def send_telegram_message(db: AsyncSession, message: str, chat_id: str = None):
    token_setting, default_chat_setting = await get_telegram_config(db)
    if not token_setting or not token_setting.value:
        return False
        
    target_chat = chat_id or (default_chat_setting.value if default_chat_setting else None)
    if not target_chat:
        return False
        
    url = f"https://api.telegram.org/bot{token_setting.value}/sendMessage"
    payload = {
        "chat_id": target_chat,
        "text": message,
        "parse_mode": "HTML"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            return response.status_code == 200
        except Exception as e:
            print(f"Telegram notification failed: {e}")
            return False
