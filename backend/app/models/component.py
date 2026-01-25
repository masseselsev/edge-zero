import uuid
from sqlalchemy import Column, String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class ComponentType(str, enum.Enum):
    CAMERA = "CAMERA"
    RADAR = "RADAR"
    GPS = "GPS"
    VSM_CONTROLLER = "VSM_CONTROLLER"
    ROUTER = "ROUTER"

class Component(Base):
    __tablename__ = "components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id"), nullable=False)
    type = Column(Enum(ComponentType, name="component_type"), nullable=False)
    vendor = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)

    box = relationship("app.models.box.Box", back_populates="components")
