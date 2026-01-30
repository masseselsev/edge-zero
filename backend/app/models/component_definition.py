import uuid
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class ComponentDefinition(Base):
    __tablename__ = "component_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    default_port = Column(String, nullable=True)
    type = Column(String, nullable=True)

    components = relationship("app.models.component.Component", back_populates="definition", cascade="all, delete-orphan")
