import psycopg2
from qdrant_client import QdrantClient
from qdrant_client.http import models

# ==========================================
# 1. Initialize PostgreSQL + PostGIS (Spatial Tables)
# ==========================================
def init_postgres():
    print("[*] Connecting to PostGIS database...")
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="drilling_data",
            user="admin",
            password="nwis_password"
        )
        cursor = conn.cursor()

        # Enable PostGIS extension for spatial/geospatial calculations
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

        # Table 1: Wellhead & General Well Metadata
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS wells (
            well_id VARCHAR(50) PRIMARY KEY,
            well_name VARCHAR(100) NOT NULL,
            basin VARCHAR(100),
            status VARCHAR(20) DEFAULT 'COMPLETED',
            surface_location GEOMETRY(Point, 4326),
            total_depth_tvd DOUBLE PRECISION
        );
        """)

        # Table 2: Stratigraphic Formation Tops
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS formation_tops (
            id SERIAL PRIMARY KEY,
            well_id VARCHAR(50) REFERENCES wells(well_id),
            formation_name VARCHAR(100) NOT NULL,
            top_tvd DOUBLE PRECISION NOT NULL,
            base_tvd DOUBLE PRECISION
        );
        """)

        # Table 3: Historical Drilling Incidents & NPT Events
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS offset_incidents (
            incident_id SERIAL PRIMARY KEY,
            well_id VARCHAR(50) REFERENCES wells(well_id),
            incident_type VARCHAR(50) NOT NULL,
            formation_name VARCHAR(100),
            event_tvd DOUBLE PRECISION NOT NULL,
            relative_formation_offset DOUBLE PRECISION,
            mud_weight_sg DOUBLE PRECISION,
            mitigation_summary TEXT
        );
        """)

        conn.commit()
        cursor.close()
        conn.close()
        print("[+] PostGIS tables and spatial extension initialized successfully.")
    except Exception as e:
        print(f"[-] PostgreSQL connection error: {e}")

# ==========================================
# 2. Initialize Qdrant (Vector Store Collection)
# ==========================================
def init_qdrant():
    print("[*] Connecting to Qdrant vector store...")
    try:
        client = QdrantClient(host="localhost", port=6333)
        collection_name = "drilling_reports"

        collections = client.get_collections().collections
        collection_names = [col.name for col in collections]

        if collection_name not in collection_names:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=384,
                    distance=models.Distance.COSINE
                )
            )
            print(f"[+] Qdrant collection '{collection_name}' created (Vector Dimension: 384).")
        else:
            print(f"[+] Qdrant collection '{collection_name}' already exists.")
    except Exception as e:
        print(f"[-] Qdrant connection error: {e}")

if __name__ == "__main__":
    init_postgres()
    init_qdrant()