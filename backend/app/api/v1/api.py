from fastapi import APIRouter
from app.api.v1.endpoints import alerts, contracts, analysis

api_router = APIRouter()
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
