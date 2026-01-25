from fastapi import FastAPI
from app.core.config import settings

from app.api.endpoints import provision, boxes, library

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.include_router(provision.router, prefix="/api/provision", tags=["provision"])
app.include_router(boxes.router, prefix="/api/boxes", tags=["boxes"])
app.include_router(library.router, prefix="/api/library", tags=["library"])

@app.get("/")
def root():
    return {"message": "Welcome to Overwatch API"}
