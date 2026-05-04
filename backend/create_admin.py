import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def create_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalars().first()
        if not user:
            print("Creating admin user...")
            new_user = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                telegram_id=None
            )
            db.add(new_user)
            await db.commit()
            print("Admin user created: admin / admin123")
        else:
            print("Admin user already exists. Resetting password to 'admin123'...")
            user.hashed_password = get_password_hash("admin123")
            await db.commit()
            print("Admin password reset to: admin123")

if __name__ == "__main__":
    asyncio.run(create_admin())
