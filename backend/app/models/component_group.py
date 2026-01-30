from sqlalchemy import Column, String, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base_class import Base

class ComponentGroup(Base):
    __tablename__ = "component_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    
    items = relationship("ComponentGroupItem", back_populates="group", cascade="all, delete-orphan")

class ComponentGroupItem(Base):
    __tablename__ = "component_group_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("component_groups.id"), nullable=False)
    definition_id = Column(UUID(as_uuid=True), ForeignKey("component_definitions.id"), nullable=False)
    count = Column(Integer, default=1)
    
    group = relationship("ComponentGroup", back_populates="items")
    definition = relationship("app.models.component_definition.ComponentDefinition")
