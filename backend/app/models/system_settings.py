from sqlalchemy import Column, String
from app.db.base_class import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=True)
