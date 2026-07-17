import asyncio
import os
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def create_admin():
    # Retrieve configured credentials, falling back if env variables are missing
    username = os.getenv("SUPERADMIN_USERNAME") or "admin"
    password = os.getenv("ADMIN_PASSWORD") or "q1w2e3r4"
    
    async with AsyncSessionLocal() as db:
        # Check if a superadmin account already exists in the database
        result = await db.execute(select(User).where(User.role == "superadmin"))
        superadmin = result.scalars().first()
        
        # Check if the target username already exists in the database
        result_by_name = await db.execute(select(User).where(User.username == username))
        user_by_name = result_by_name.scalars().first()
        
        if not superadmin:
            if user_by_name:
                print(f"User '{username}' already exists. Upgrading to superadmin...")
                user_by_name.role = "superadmin"
                user_by_name.hashed_password = get_password_hash(password)
                await db.commit()
                print(f"User '{username}' upgraded to superadmin successfully.")
            else:
                print(f"Creating superadmin user '{username}'...")
                new_user = User(
                    username=username,
                    hashed_password=get_password_hash(password),
                    telegram_id=None,
                    role="superadmin"
                )
                db.add(new_user)
                await db.commit()
                print(f"Superadmin user '{username}' created successfully.")
        else:
            print(f"Superadmin user already exists (username: '{superadmin.username}').")
            # If the username changed in env, update the existing superadmin username & password
            if superadmin.username != username:
                print(f"Updating superadmin username from '{superadmin.username}' to '{username}'...")
                superadmin.username = username
                superadmin.hashed_password = get_password_hash(password)
                await db.commit()
                print("Superadmin credentials updated successfully.")

if __name__ == "__main__":
    asyncio.run(create_admin())
