from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID

class ComponentGroupItemBase(BaseModel):
    definition_id: UUID
    count: int = 1

class ComponentGroupItemCreate(ComponentGroupItemBase):
    pass

class ComponentGroupItem(ComponentGroupItemBase):
    id: UUID
    group_id: UUID
    
    model_config = ConfigDict(from_attributes=True)

class ComponentGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class ComponentGroupCreate(ComponentGroupBase):
    items: List[ComponentGroupItemCreate] = []

class ComponentGroup(ComponentGroupBase):
    id: UUID
    items: List[ComponentGroupItem] = []
    
    model_config = ConfigDict(from_attributes=True)
