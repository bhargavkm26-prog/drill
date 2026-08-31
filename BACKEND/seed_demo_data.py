"""
eRTMAC-NWIS Demo Data Seeder
=============================
Seeds the PostGIS database with realistic wells, formations, and incidents
based on Oil India's Upper Assam Basin operations.

Run: python seed_demo_data.py
Requires: Docker containers (postgis + qdrant) running
"""

import sys
import os

# Add parent path so app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import UserRecord, WellRecord, FormationRecord, IncidentRecord
from app.auth import hash_password
from geoalchemy2.elements import WKTElement
from sqlalchemy import text


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Enable PostGIS extension
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()

    db = SessionLocal()

    try:
        # ══════════════════════════════════════════════════════
        # 1. USERS
        # ══════════════════════════════════════════════════════
        users = [
            {"username": "admin", "password": "admin", "full_name": "System Administrator", "role": "Admin"},
            {"username": "engineer1", "password": "engineer123", "full_name": "Rajesh Kumar Singh", "role": "Engineer"},
            {"username": "engineer2", "password": "engineer123", "full_name": "Priya Devi Gogoi", "role": "Engineer"},
            {"username": "viewer1", "password": "viewer123", "full_name": "Monitoring Dashboard", "role": "Viewer"},
        ]

        for u in users:
            if not db.query(UserRecord).filter(UserRecord.username == u["username"]).first():
                db.add(UserRecord(
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                ))
        db.commit()
        print("[+] Users seeded.")

        # ══════════════════════════════════════════════════════
        # 2. WELLS (Upper Assam Basin — Oil India operating areas)
        # ══════════════════════════════════════════════════════
        wells_data = [
            {
                "name": "DLJ-15", "lat": 27.3720, "lon": 95.3180,
                "depth": 4200.0, "basin": "Upper Assam", "status": "COMPLETED",
            },
            {
                "name": "DLJ-22", "lat": 27.3685, "lon": 95.3250,
                "depth": 3800.0, "basin": "Upper Assam", "status": "COMPLETED",
            },
            {
                "name": "MRN-07", "lat": 27.1500, "lon": 94.9000,
                "depth": 3950.0, "basin": "Upper Assam", "status": "COMPLETED",
            },
            {
                "name": "MRN-12", "lat": 27.1550, "lon": 94.9100,
                "depth": 4100.0, "basin": "Upper Assam", "status": "ACTIVE",
            },
            {
                "name": "NHK-09", "lat": 27.2850, "lon": 95.3400,
                "depth": 3600.0, "basin": "Upper Assam", "status": "COMPLETED",
            },
            {
                "name": "NHK-18", "lat": 27.2900, "lon": 95.3350,
                "depth": 4000.0, "basin": "Upper Assam", "status": "ACTIVE",
            },
        ]

        well_objects = {}
        for w in wells_data:
            existing = db.query(WellRecord).filter(WellRecord.well_name == w["name"]).first()
            if not existing:
                well = WellRecord(
                    well_name=w["name"],
                    location=WKTElement(f"POINT({w['lon']} {w['lat']})", srid=4326),
                    target_depth_m=w["depth"],
                    basin=w["basin"],
                    status=w["status"],
                )
                db.add(well)
                db.commit()
                db.refresh(well)
                well_objects[w["name"]] = well
            else:
                well_objects[w["name"]] = existing

        print(f"[+] {len(wells_data)} wells seeded.")

        # ══════════════════════════════════════════════════════
        # 3. FORMATION TOPS (Typical Upper Assam stratigraphy)
        # ══════════════════════════════════════════════════════
        formations_data = {
            "DLJ-15": [
                ("Alluvium", 0, 150, "Clay"),
                ("Dihing", 150, 800, "Sandstone"),
                ("Namsang", 800, 1500, "Sandstone"),
                ("Girujan", 1500, 2200, "Clay"),
                ("Tipam", 2200, 2800, "Sandstone"),
                ("Barail", 2800, 3600, "Siltstone"),
                ("Naga Thrust", 3600, 4200, "Shale"),
            ],
            "DLJ-22": [
                ("Alluvium", 0, 140, "Clay"),
                ("Dihing", 140, 780, "Sandstone"),
                ("Namsang", 780, 1480, "Sandstone"),
                ("Girujan", 1480, 2150, "Clay"),
                ("Tipam", 2150, 2750, "Sandstone"),
                ("Barail", 2750, 3500, "Siltstone"),
                ("Naga Thrust", 3500, 3800, "Shale"),
            ],
            "MRN-07": [
                ("Alluvium", 0, 160, "Clay"),
                ("Dihing", 160, 850, "Sandstone"),
                ("Namsang", 850, 1550, "Sandstone"),
                ("Girujan", 1550, 2300, "Clay"),
                ("Tipam", 2300, 2900, "Sandstone"),
                ("Barail", 2900, 3700, "Siltstone"),
                ("Naga Thrust", 3700, 3950, "Shale"),
            ],
            "MRN-12": [
                ("Alluvium", 0, 155, "Clay"),
                ("Dihing", 155, 820, "Sandstone"),
                ("Namsang", 820, 1520, "Sandstone"),
                ("Girujan", 1520, 2250, "Clay"),
                ("Tipam", 2250, 2850, "Sandstone"),
                ("Barail", 2850, 3650, "Siltstone"),
                ("Naga Thrust", 3650, 4100, "Shale"),
            ],
            "NHK-09": [
                ("Alluvium", 0, 145, "Clay"),
                ("Dihing", 145, 790, "Sandstone"),
                ("Namsang", 790, 1490, "Sandstone"),
                ("Girujan", 1490, 2180, "Clay"),
                ("Tipam", 2180, 2780, "Sandstone"),
                ("Barail", 2780, 3400, "Siltstone"),
                ("Naga Thrust", 3400, 3600, "Shale"),
            ],
            "NHK-18": [
                ("Alluvium", 0, 148, "Clay"),
                ("Dihing", 148, 800, "Sandstone"),
                ("Namsang", 800, 1500, "Sandstone"),
                ("Girujan", 1500, 2200, "Clay"),
                ("Tipam", 2200, 2800, "Sandstone"),
                ("Barail", 2800, 3500, "Siltstone"),
                ("Naga Thrust", 3500, 4000, "Shale"),
            ],
        }

        formation_count = 0
        for well_name, formations in formations_data.items():
            well = well_objects.get(well_name)
            if not well:
                continue
            # Skip if formations already exist for this well
            existing_count = db.query(FormationRecord).filter(FormationRecord.well_id == well.id).count()
            if existing_count > 0:
                continue
            for fname, top, bottom, lithology in formations:
                db.add(FormationRecord(
                    well_id=well.id,
                    formation_name=fname,
                    top_depth_m=top,
                    bottom_depth_m=bottom,
                    lithology=lithology,
                ))
                formation_count += 1
        db.commit()
        print(f"[+] {formation_count} formation tops seeded.")

        # ══════════════════════════════════════════════════════
        # 4. HISTORICAL INCIDENTS (Based on real Assam drilling challenges)
        # ══════════════════════════════════════════════════════
        incidents_data = [
            # DLJ-15 — Had multiple issues in Barail
            {
                "well": "DLJ-15", "depth": 3450, "formation": "Barail",
                "type": "Stuck Pipe", "severity": "Critical",
                "mud_weight": 1.35, "npt": 48,
                "sop": "Reduce WOB to 15 klbs. Increase circulation rate to 600 GPM. "
                       "Apply 20 bbl of diesel-based spotting fluid. Work pipe with 50 klbs overpull. "
                       "If not free in 4 hours, prepare for back-off operations.",
            },
            {
                "well": "DLJ-15", "depth": 2850, "formation": "Barail",
                "type": "Mud Loss", "severity": "High",
                "mud_weight": 1.30, "npt": 24,
                "sop": "Reduce mud weight to 1.20 SG. Pump 100 bbl LCM pill (mica + "
                       "cellulose flakes, 30 ppb concentration). Monitor returns for 2 circulations. "
                       "If losses continue, consider cement squeeze.",
            },
            {
                "well": "DLJ-15", "depth": 3200, "formation": "Barail",
                "type": "Torque Spike", "severity": "Medium",
                "mud_weight": 1.32, "npt": 6,
                "sop": "Reduce WOB by 50%. Increase RPM to 120. Pump high-viscosity sweep "
                       "(100 bbl at 70 sec/qt). Monitor torque for 30 minutes.",
            },

            # DLJ-22 — Tight hole problems
            {
                "well": "DLJ-22", "depth": 2780, "formation": "Tipam",
                "type": "Tight Hole", "severity": "Medium",
                "mud_weight": 1.25, "npt": 12,
                "sop": "Ream tight section at 50% penetration rate. Pump viscous pill "
                       "before pulling out. Consider reaming wiper trip every 200m.",
            },
            {
                "well": "DLJ-22", "depth": 3100, "formation": "Barail",
                "type": "Wellbore Instability", "severity": "High",
                "mud_weight": 1.28, "npt": 36,
                "sop": "Increase mud weight to 1.35 SG. Add 5% KCl for shale inhibition. "
                       "Maintain ECD below fracture gradient (1.50 SG). "
                       "Consider casing point if cavings exceed 5% of returns.",
            },

            # MRN-07 — Gas kick
            {
                "well": "MRN-07", "depth": 3650, "formation": "Naga Thrust",
                "type": "Kick", "severity": "Critical",
                "mud_weight": 1.40, "npt": 72,
                "sop": "SHUT IN WELL IMMEDIATELY. Record SIDPP and SICP. "
                       "Kill well using Driller's Method. Increase kill mud weight "
                       "by 0.5 ppg above kick-imposed pressure. Circulate out influx "
                       "through choke. DO NOT resume drilling until well is confirmed dead.",
            },
            {
                "well": "MRN-07", "depth": 2950, "formation": "Barail",
                "type": "Mud Loss", "severity": "Medium",
                "mud_weight": 1.32, "npt": 8,
                "sop": "Reduce pump rate by 30%. Pump 50 bbl LCM pill. "
                       "Monitor pit levels continuously. If total losses, "
                       "stop drilling and evaluate cement plug placement.",
            },

            # MRN-12 — Currently drilling, has early warnings
            {
                "well": "MRN-12", "depth": 2880, "formation": "Barail",
                "type": "Torque Spike", "severity": "Medium",
                "mud_weight": 1.30, "npt": 4,
                "sop": "Reduce WOB to 10 klbs. Circulate bottoms up. "
                       "Monitor for cuttings accumulation. Increase flow rate if possible.",
            },

            # NHK-09 — Stuck pipe in Siltstone
            {
                "well": "NHK-09", "depth": 3380, "formation": "Barail",
                "type": "Stuck Pipe", "severity": "High",
                "mud_weight": 1.33, "npt": 30,
                "sop": "Apply maximum safe overpull (80% of drillpipe tensile). "
                       "Pump 30 bbl of diesel-based spotting fluid. Work pipe continuously. "
                       "If stuck for >8 hours, prepare mechanical jar run.",
            },
            {
                "well": "NHK-09", "depth": 2200, "formation": "Girujan",
                "type": "Mud Loss", "severity": "Low",
                "mud_weight": 1.18, "npt": 4,
                "sop": "Reduce flow rate by 20%. Add fine LCM (25 ppb). "
                       "Resume normal operations after 1 circulation.",
            },

            # NHK-18 — Ongoing well with formation challenges
            {
                "well": "NHK-18", "depth": 2820, "formation": "Barail",
                "type": "Wellbore Instability", "severity": "Medium",
                "mud_weight": 1.27, "npt": 10,
                "sop": "Increase mud weight to 1.32 SG. Add 3% KCl. "
                       "Limit open hole exposure time. Consider running intermediate casing.",
            },
            {
                "well": "NHK-18", "depth": 3520, "formation": "Naga Thrust",
                "type": "Mud Loss", "severity": "High",
                "mud_weight": 1.38, "npt": 20,
                "sop": "Reduce mud weight to 1.30 SG. Pump 150 bbl LCM pill with "
                       "coarse + medium + fine blend. If losses exceed 50 bbl/hr, "
                       "prepare for cement squeeze at loss zone.",
            },

            # Additional: H2S detection
            {
                "well": "MRN-07", "depth": 3700, "formation": "Naga Thrust",
                "type": "H2S Detection", "severity": "Critical",
                "mud_weight": 1.42, "npt": 16,
                "sop": "ACTIVATE H2S CONTINGENCY PLAN. All personnel don SCBA equipment. "
                       "Increase mud weight to overbalance formation. Add zinc carbonate "
                       "scavenger (10 ppb). Monitor H2S levels continuously with Dräger tubes. "
                       "Evacuate non-essential personnel from rig floor.",
            },
        ]

        incident_count = 0
        for inc in incidents_data:
            well = well_objects.get(inc["well"])
            if not well:
                continue
            # Skip if this exact incident already exists
            existing = db.query(IncidentRecord).filter(
                IncidentRecord.well_id == well.id,
                IncidentRecord.depth_m == inc["depth"],
                IncidentRecord.incident_type == inc["type"],
            ).first()
            if existing:
                continue
            db.add(IncidentRecord(
                well_id=well.id,
                depth_m=inc["depth"],
                formation_name=inc["formation"],
                incident_type=inc["type"],
                severity=inc["severity"],
                mud_weight_sg=inc["mud_weight"],
                npt_hours=inc["npt"],
                mitigation_sop=inc["sop"],
                event_date=datetime.utcnow() - timedelta(days=365 * 2),  # ~2 years ago
            ))
            incident_count += 1

        db.commit()
        print(f"[+] {incident_count} historical incidents seeded.")

        print("\n" + "=" * 60)
        print("  ✅ DATABASE SEEDED SUCCESSFULLY")
        print("=" * 60)
        print("\n  Login credentials:")
        print("  ├── Admin:     admin / admin")
        print("  ├── Engineer:  engineer1 / engineer123")
        print("  ├── Engineer:  engineer2 / engineer123")
        print("  └── Viewer:    viewer1 / viewer123")
        print(f"\n  Wells: {len(wells_data)}")
        print(f"  Formations: {formation_count}")
        print(f"  Incidents: {incident_count}")
        print(f"\n  Start server: uvicorn app.main:app --reload")
        print(f"  API docs:     http://localhost:8000/docs")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed()
