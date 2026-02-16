#!/usr/bin/env python3
"""
Quick script to add new contracts to existing database without full reset.
"""
import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import SessionLocal
from app.models.contract import Contract
from loguru import logger

def add_new_contracts():
    db = SessionLocal()
    try:
        json_path = os.path.join(os.path.dirname(__file__), 'seed_contracts.json')
        with open(json_path) as f:
            data = json.load(f)
        
        added_count = 0
        for item in data:
            exists = db.query(Contract).filter_by(
                cftc_contract_code=item['cftc_contract_code']
            ).first()
            
            if not exists:
                contract = Contract(
                    cftc_contract_code=item['cftc_contract_code'],
                    contract_name=item['contract_name'],
                    market_category=item['market_category'],
                    yahoo_ticker=item['yahoo_ticker'],
                    exchange=item.get('exchange'),
                    expiry_rule=item.get('expiry_rule', 'third_friday'),
                    contract_unit_value=item.get('contract_unit_value', 1.0)
                )
                db.add(contract)
                logger.info(f"✅ Adding: {item['contract_name']}")
                added_count += 1
            else:
                logger.debug(f"⏭️  Already exists: {item['contract_name']}")
        
        db.commit()
        logger.success(f"✅ Added {added_count} new contracts!")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_new_contracts()
