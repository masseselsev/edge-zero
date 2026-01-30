from pydantic import BaseModel, ConfigDict, field_validator
from enum import Enum
from typing import Optional, List, Union, Any
from uuid import UUID
from datetime import datetime
from ipaddress import IPv4Address, IPv6Address
from .device_group import DeviceGroupBase
from .location import Location

class BoxStatus(str, Enum):
    NEW = "NEW"
    STAGING = "STAGING"
    INSTALLING = "INSTALLING"
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"

class BoxBase(BaseModel):
    internal_sn: str
    mac_address: str
    ip_address: Optional[Union[str, IPv4Address, IPv6Address]] = None
    status: BoxStatus = BoxStatus.NEW
    location_id: Optional[UUID] = None
    location: Optional[Location] = None
    notes: Optional[str] = None
    ssh_port: int = 2222
    ssh_username: str = "user"
    ssh_password: str = "admin"

    @field_validator('mac_address')
    @classmethod
    def normalize_mac(cls, v: str) -> str:
        if v:
            # Replace dashes with colons and uppercase
            return v.strip().replace('-', ':').upper()
        return v

class BoxCreate(BoxBase):
    template_id: Optional[UUID] = None

class BoxUpdate(BaseModel):
    internal_sn: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    status: Optional[BoxStatus] = None
    location_id: Optional[UUID] = None
    notes: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None

    @field_validator('mac_address')
    @classmethod
    def normalize_mac(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v).strip().replace('-', ':').upper()

from app.schemas.library import ComponentDefinition

class ComponentBase(BaseModel):
    definition_id: UUID
    serial_number: Optional[str] = None

class ComponentCreate(ComponentBase):
    pass

class Component(ComponentBase):
    id: UUID
    box_id: UUID
    definition: Optional[ComponentDefinition] = None

    model_config = ConfigDict(from_attributes=True)

class Box(BoxBase):
    id: UUID
    components: List[Component] = []
    
    model_config = ConfigDict(from_attributes=True)
