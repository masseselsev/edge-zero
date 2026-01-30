from sqlalchemy import Column, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base_class import Base

# Association Table
box_device_groups = Table(
    'box_device_groups',
    Base.metadata,
    Column('box_id', UUID(as_uuid=True), ForeignKey('boxes.id'), primary_key=True),
    Column('group_id', UUID(as_uuid=True), ForeignKey('device_groups.id'), primary_key=True)
)

class DeviceGroup(Base):
    __tablename__ = "device_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    
    # Relationship to Box (Many-to-Many)
    boxes = relationship("app.models.box.Box", secondary=box_device_groups, back_populates="device_groups")
