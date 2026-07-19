from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging
import asyncio

engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


class DBLoggingHandler(logging.Handler):
    def emit(self, record):
        if getattr(record, "_logged_to_db", False):
            return
        try:
            record._logged_to_db = True
        except Exception:
            pass

        name = record.name.lower()
        if (
            name.startswith("sqlalchemy") or
            name.startswith("urllib3") or
            "insert into system_logs" in record.getMessage().lower()
        ):
            return

        level = record.levelname
        message = self.format(record)

        # Async DB write worker
        async def async_write():
            try:
                async with AsyncSessionLocal() as db:
                    from app.models.system_log import SystemLog
                    log_entry = SystemLog(level=level, message=message)
                    db.add(log_entry)
                    await db.commit()
            except Exception:
                pass

        # Schedule async task in loop or run sync
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                loop.create_task(async_write())
            else:
                asyncio.run(async_write())
        except RuntimeError:
            asyncio.run(async_write())


def setup_db_logging():
    root = logging.getLogger()
    
    handler = None
    for h in root.handlers:
        if isinstance(h, DBLoggingHandler):
            handler = h
            break
            
    if handler is None:
        handler = DBLoggingHandler()
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
        handler.setFormatter(formatter)
        root.addHandler(handler)

    loggers_to_attach = [
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "fastapi"
    ]
    for name in loggers_to_attach:
        l = logging.getLogger(name)
        if not any(isinstance(h, DBLoggingHandler) for h in l.handlers):
            l.addHandler(handler)
