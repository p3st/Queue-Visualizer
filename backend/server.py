from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_PATH = "/app/backend/work_orders.db"

def init_database():
    """Initialize the database with sample work orders"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create work_orders table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS work_orders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            priority TEXT NOT NULL,
            product_type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Check if we have data, if not, insert sample data
    cursor.execute("SELECT COUNT(*) FROM work_orders")
    count = cursor.fetchone()[0]
    
    if count == 0:
        # Insert sample work orders with more variety
        sample_orders = [
            ("WO-2024-001", "Hydraulic Pump Assembly", "High", "HydraulicPump"),
            ("WO-2024-002", "Engine Block Machining", "Medium", "EngineBlock"),
            ("WO-2024-003", "Transmission Case", "High", "TransmissionCase"),
            ("WO-2024-004", "Brake Disc Turning", "Low", "BrakeDisc"),
            ("WO-2024-005", "Cylinder Head Repair", "High", "CylinderHead"),
            ("WO-2024-006", "Fuel Injection System", "Medium", "FuelInjection"),
            ("WO-2024-007", "Axle Assembly", "High", "Axle"),
            ("WO-2024-008", "Clutch Replacement", "Low", "Clutch"),
            ("WO-2024-009", "Turbocharger Rebuild", "High", "Turbocharger"),
            ("WO-2024-010", "Radiator Repair", "Medium", "Radiator"),
            ("WO-2024-011", "Exhaust System", "Low", "Exhaust"),
            ("WO-2024-012", "Steering Gear Box", "High", "SteeringGear"),
            ("WO-2024-013", "Differential Assembly", "Medium", "Differential"),
            ("WO-2024-014", "Suspension Component", "Low", "Suspension"),
            ("WO-2024-015", "Electrical Harness", "High", "Electrical"),
            ("WO-2024-016", "Cooling System", "Medium", "CoolingSystem"),
            ("WO-2024-017", "Oil Pump Assembly", "High", "OilPump"),
            ("WO-2024-018", "Valve Train Repair", "Low", "ValveTrain"),
            ("WO-2024-019", "Intake Manifold", "Medium", "IntakeManifold"),
            ("WO-2024-020", "Carburetor Rebuild", "High", "Carburetor")
        ]
        
        cursor.executemany("""
            INSERT INTO work_orders (id, name, priority, product_type)
            VALUES (?, ?, ?, ?)
        """, sample_orders)
        
        conn.commit()
        print("Database initialized with sample work orders")
    
    conn.close()

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_database()

@app.get("/")
async def root():
    return {"message": "Production Queue Dashboard API"}

@app.get("/api/work-orders")
async def get_work_orders():
    """Get all work orders from the database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, priority, product_type, created_at, updated_at
            FROM work_orders
            ORDER BY created_at ASC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        work_orders = []
        for row in rows:
            work_orders.append({
                "id": row[0],
                "name": row[1],
                "priority": row[2],
                "productType": row[3],
                "created_at": row[4],
                "updated_at": row[5]
            })
        
        return {"work_orders": work_orders, "count": len(work_orders)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/work-orders/refresh")
async def refresh_work_orders():
    """Refresh/reload work orders from database"""
    try:
        # This endpoint can be used to trigger database refresh
        # In a real production environment, this might sync with external systems
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Update the updated_at timestamp for all orders to simulate fresh data
        cursor.execute("""
            UPDATE work_orders 
            SET updated_at = CURRENT_TIMESTAMP
        """)
        
        conn.commit()
        conn.close()
        
        # Return fresh data
        return await get_work_orders()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh error: {str(e)}")

@app.get("/api/product-times")
async def get_product_times():
    """Get product processing times configuration"""
    # Updated with much bigger differences in process times
    product_times = {
        "HydraulicPump": 480,      # 8 hours - Complex hydraulic system
        "EngineBlock": 720,        # 12 hours - Heavy machining
        "TransmissionCase": 360,   # 6 hours - Precision assembly
        "BrakeDisc": 90,           # 1.5 hours - Simple turning
        "CylinderHead": 540,       # 9 hours - Precision machining
        "FuelInjection": 180,      # 3 hours - Fine tuning
        "Axle": 240,               # 4 hours - Heavy assembly
        "Clutch": 120,             # 2 hours - Standard replacement
        "Turbocharger": 600,       # 10 hours - Complex rebuild
        "Radiator": 150,           # 2.5 hours - Repair work
        "Exhaust": 60,             # 1 hour - Welding work
        "SteeringGear": 300,       # 5 hours - Precision adjustment
        "Differential": 420,       # 7 hours - Complex assembly
        "Suspension": 180,         # 3 hours - Component replacement
        "Electrical": 240,         # 4 hours - Wiring and testing
        "CoolingSystem": 210,      # 3.5 hours - System integration
        "OilPump": 270,            # 4.5 hours - Pump rebuild
        "ValveTrain": 390,         # 6.5 hours - Precision timing
        "IntakeManifold": 165,     # 2.75 hours - Manifold work
        "Carburetor": 195,         # 3.25 hours - Rebuild process
        "Default": 240             # 4 hours - Default time
    }
    
    return {"product_times": product_times}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
