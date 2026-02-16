import sys
import os

sys.path.append(os.getcwd())

# Set Local Defaults BEFORE importing config
os.environ.setdefault("POSTGRES_HOST", "127.0.0.1")
os.environ.setdefault("POSTGRES_PORT", "5433")
os.environ.setdefault("POSTGRES_USER", "user")
os.environ.setdefault("POSTGRES_PASSWORD", "password")
os.environ.setdefault("POSTGRES_DB", "whaleradarr")

from app.db.session import SessionLocal
from app.models.alert import WhaleAlert

db = SessionLocal()
alerts = db.query(WhaleAlert).filter(WhaleAlert.contract_id == 1).order_by(WhaleAlert.report_date.desc()).all()

print(f"Found {len(alerts)} alerts for Contract 1")
for a in alerts:
    print(f"Date: {a.report_date}, Z-Score: {a.z_score}")

db.close()
