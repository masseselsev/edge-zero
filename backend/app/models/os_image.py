import uuid
from sqlalchemy import Column, String, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base
import enum

class OsType(str, enum.Enum):
    DEBIAN = "DEBIAN"
    UBUNTU = "UBUNTU"

class OsImage(Base):
    __tablename__ = "os_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    os_type = Column(Enum(OsType, name="os_type"), nullable=False)
    is_active = Column(Boolean, default=False)
