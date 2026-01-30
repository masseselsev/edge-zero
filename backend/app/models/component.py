import uuid
from sqlalchemy import Column, String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class Component(Base):
    __tablename__ = "components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id"), nullable=False)
    definition_id = Column(UUID(as_uuid=True), ForeignKey("component_definitions.id"), nullable=False)
    
    # Optional overrides or specific info
    serial_number = Column(String, nullable=True) 
    # vendor/model are now in definition, but maybe we keep them if they deviate?
    # For simplicitly, let's rely on definition for static info.
    # But wait, "component instances" might have specific versions?
    # The prompt said "contain names, descriptions and default ports".
    # So the instance is just "I have a VSM2".
    
    box = relationship("app.models.box.Box", back_populates="components")
    definition = relationship("app.models.component_definition.ComponentDefinition", back_populates="components")
