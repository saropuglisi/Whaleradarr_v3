from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.contract import Contract
from app.models.statistics import ContractStatistics
from app.schemas.contract import ContractSchema, ContractDetailSchema, ContractStatsSchema

router = APIRouter()

def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[ContractSchema])
def get_contracts(
    db: Session = Depends(get_db),
    active_only: bool = True
):
    """
    Get list of contracts.
    """
    query = db.query(Contract)
    if active_only:
        query = query.filter(Contract.is_active == True)
        
    return query.all()

@router.get("/{contract_id}", response_model=ContractDetailSchema)
def get_contract_detail(
    contract_id: int,
    db: Session = Depends(get_db)
):
    """
    Get contract details including statistics.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    # Manual validation to shape the response with nested stats
    # Assuming we don't have a direct relationship back in the model for stats yet...
    # Oh wait, we didn't add relationship in models/contract.py for stats!
    # Let's fetch manually.
    
    stats = db.query(ContractStatistics).filter(ContractStatistics.contract_id == contract_id).all()
    
    # Create response object
    response = ContractDetailSchema.model_validate(contract)
    
    # Map stats to schema
    stats_list = []
    for s in stats:
        stats_list.append(ContractStatsSchema.model_validate(s))
        
    response.statistics = stats_list
    
    return response
