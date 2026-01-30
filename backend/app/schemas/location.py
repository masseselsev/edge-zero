from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class LocationBase(BaseModel):
    name: str
    description: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(LocationBase):
    pass

class Location(LocationBase):
    id: UUID

    class Config:
        from_attributes = True
