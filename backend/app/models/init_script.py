import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class InitScript(Base):
    __tablename__ = "init_scripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    # Could store content in DB or as file. 
    # For ISOs we stored files. For scripts (small text), DB is okay but files are better for editing/serving via nginx.
    # Let's stick to File-based storage pattern for consistency with ISOs.
