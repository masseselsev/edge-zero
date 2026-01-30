# ... OsImage schemas ...
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from enum import Enum

class OsType(str, Enum):
    DEBIAN = "DEBIAN"
    UBUNTU = "UBUNTU"

class OsImageBase(BaseModel):
    filename: str
    os_type: OsType
    is_active: bool = False

class OsImageCreate(OsImageBase):
    pass

class OsImage(OsImageBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class InitScriptBase(BaseModel):
    filename: str

class InitScriptCreate(InitScriptBase):
    pass

class InitScript(InitScriptBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class SystemSettingBase(BaseModel):
    key: str
    value: str | None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSetting(SystemSettingBase):
    model_config = ConfigDict(from_attributes=True)

class ComponentDefinitionBase(BaseModel):
    name: str
    description: str | None = None
    default_port: str | None = None
    type: str | None = None

class ComponentDefinitionCreate(ComponentDefinitionBase):
    pass

class ComponentDefinitionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    default_port: str | None = None
    type: str | None = None

class ComponentDefinition(ComponentDefinitionBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
