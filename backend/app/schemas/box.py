from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class BoxStatus(str, Enum):
    NEW = "NEW"
    STAGING = "STAGING"
    INSTALLING = "INSTALLING"
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"

class BoxBase(BaseModel):
    internal_sn: str
    mac_address: str
    ip_address: Optional[str] = None
    status: BoxStatus = BoxStatus.NEW
    location: Optional[str] = None
    notes: Optional[str] = None

class BoxCreate(BoxBase):
    pass

class BoxUpdate(BaseModel):
    internal_sn: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    status: Optional[BoxStatus] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class Box(BoxBase):
    id: UUID
    
    model_config = ConfigDict(from_attributes=True)

class ComponentBase(BaseModel):
    type: str
    vendor: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None

class ComponentCreate(ComponentBase):
    pass

class Component(ComponentBase):
    id: UUID
    box_id: UUID

    model_config = ConfigDict(from_attributes=True)
