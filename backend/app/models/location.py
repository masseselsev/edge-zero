import uuid
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)

    # Localization Settings
    timezone = Column(String, default="UTC", nullable=False)
    locale = Column(String, default="en_US.UTF-8", nullable=False)
    keyboard = Column(String, default="us", nullable=False)

    # Network Settings
    gateway = Column(String, nullable=True)
    netmask = Column(String, nullable=True)
    dns_server = Column(String, nullable=True)
    ntp_server = Column(String, nullable=True)
    package_mirror = Column(String, nullable=True)

    # SSH & Custom Configs
    ssh_public_key = Column(Text, nullable=True)

    boxes = relationship("Box", back_populates="location")
