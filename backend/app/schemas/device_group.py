from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID

class DeviceGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class DeviceGroupCreate(DeviceGroupBase):
    pass

class DeviceGroup(DeviceGroupBase):
    id: UUID
    # boxes: List[UUID] = [] # Avoid circular deps for now, maybe just count?

    model_config = ConfigDict(from_attributes=True)
