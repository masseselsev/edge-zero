import uuid
from sqlalchemy import Column, String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class LogicalDevice(str, enum.Enum):
    RADAR = "RADAR"
    VSM_CONTROLLER = "VSM_CONTROLLER"
    CAMERA_MAIN = "CAMERA_MAIN"

class PortMapping(Base):
    __tablename__ = "port_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id"), nullable=False)
    logical_device = Column(Enum(LogicalDevice, name="logical_device"), nullable=False)
    connection_point = Column(String, nullable=False) # e.g., /dev/ttyUSB0 or 192.168.1.100

    box = relationship("app.models.box.Box", back_populates="port_mappings")
