from sqlalchemy import Column, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class VpnCredential(Base):
    __tablename__ = "vpn_credentials"

    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id"), primary_key=True)
    ca_cert = Column(Text, nullable=False)
    client_cert = Column(Text, nullable=False)
    client_key = Column(Text, nullable=False)

    box = relationship("app.models.box.Box", back_populates="vpn_credential")
