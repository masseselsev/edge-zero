from fastapi import FastAPI
from app.core.config import settings

from app.api.endpoints import provision, boxes, library, device_groups, system, locations

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.include_router(provision.router, prefix="/api/provision", tags=["provision"])
app.include_router(boxes.router, prefix="/api/boxes", tags=["boxes"])
app.include_router(library.router, prefix="/api/library", tags=["library"])
app.include_router(device_groups.router, prefix="/api/device-groups", tags=["device-groups"])
app.include_router(locations.router, prefix="/api/locations", tags=["locations"])
app.include_router(system.router, prefix="/api/system", tags=["system"])

@app.get("/")
def root():
    return {"message": "Welcome to Overwatch API"}
