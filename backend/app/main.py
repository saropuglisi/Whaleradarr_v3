from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="2.5.0"
)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.5.0"}

@app.get("/")
def root():
    return {"message": "Welcome to WhaleRadarr API"}
