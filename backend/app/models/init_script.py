import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class InitScript(Base):
    __tablename__ = "init_scripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    hardware_comment = Column(String, nullable=True)

