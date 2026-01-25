import uuid
from sqlalchemy import Column, String, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, INET, MACADDR
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class BoxStatus(str, enum.Enum):
    NEW = "NEW"
    STAGING = "STAGING"
    INSTALLING = "INSTALLING"
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"

class Box(Base):
    __tablename__ = "boxes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    internal_sn = Column(String, unique=True, nullable=False)
    mac_address = Column(MACADDR, unique=True, nullable=False)
    ip_address = Column(INET, nullable=True) # Check if static IP is mandatory initially or assigned later. Prompt says "Static IP assigned by us"
    status = Column(Enum(BoxStatus, name="box_status"), default=BoxStatus.NEW)
    location = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    components = relationship("Component", back_populates="box", cascade="all, delete-orphan")
    port_mappings = relationship("PortMapping", back_populates="box", cascade="all, delete-orphan")
    vpn_credential = relationship("VpnCredential", back_populates="box", uselist=False, cascade="all, delete-orphan")
