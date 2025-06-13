from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
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

class WorkOrderUpdate(BaseModel):
    id: str
    position: int

class WorkOrderReorder(BaseModel):
    work_orders: List[WorkOrderUpdate]

def init_database():
    """Initialize the database with sample work orders"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create work_orders table with position column
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS work_orders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            priority TEXT NOT NULL,
            product_type TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Check if we have data, if not, insert sample data
    cursor.execute("SELECT COUNT(*) FROM work_orders")
    count = cursor.fetchone()[0]
    
    if count == 0:
        # Insert sample work orders with priority-based positions
        sample_orders = [
            ("WO-2024-001", "Hydraulic Pump Assembly", "High", "HydraulicPump", 1),
            ("WO-2024-003", "Transmission Case", "High", "TransmissionCase", 2),
            ("WO-2024-005", "Cylinder Head Repair", "High", "CylinderHead", 3),
            ("WO-2024-007", "Axle Assembly", "High", "Axle", 4),
            ("WO-2024-009", "Turbocharger Rebuild", "High", "Turbocharger", 5),
            ("WO-2024-012", "Steering Gear Box", "High", "SteeringGear", 6),
            ("WO-2024-015", "Electrical Harness", "High", "Electrical", 7),
            ("WO-2024-017", "Oil Pump Assembly", "High", "OilPump", 8),
            ("WO-2024-020", "Carburetor Rebuild", "High", "Carburetor", 9),
            ("WO-2024-002", "Engine Block Machining", "Medium", "EngineBlock", 10),
            ("WO-2024-006", "Fuel Injection System", "Medium", "FuelInjection", 11),
            ("WO-2024-010", "Radiator Repair", "Medium", "Radiator", 12),
            ("WO-2024-013", "Differential Assembly", "Medium", "Differential", 13),
            ("WO-2024-016", "Cooling System", "Medium", "CoolingSystem", 14),
            ("WO-2024-019", "Intake Manifold", "Medium", "IntakeManifold", 15),
            ("WO-2024-004", "Brake Disc Turning", "Low", "BrakeDisc", 16),
            ("WO-2024-008", "Clutch Replacement", "Low", "Clutch", 17),
            ("WO-2024-011", "Exhaust System", "Low", "Exhaust", 18),
            ("WO-2024-014", "Suspension Component", "Low", "Suspension", 19),
            ("WO-2024-018", "Valve Train Repair", "Low", "ValveTrain", 20)
        ]
        
        cursor.executemany("""
            INSERT INTO work_orders (id, name, priority, product_type, position)
            VALUES (?, ?, ?, ?, ?)
        """, sample_orders)
        
        conn.commit()
        print("Database initialized with sample work orders in priority order")
    
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
    """Get all work orders from the database ordered by position (user-defined order preserved)"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Order by position to preserve user-defined order
        cursor.execute("""
            SELECT id, name, priority, product_type, position, created_at, updated_at
            FROM work_orders
            ORDER BY position ASC
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
                "position": row[4],
                "created_at": row[5],
                "updated_at": row[6]
            })
        
        return {"work_orders": work_orders, "count": len(work_orders)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/work-orders/reorder")
async def reorder_work_orders(reorder_data: WorkOrderReorder):
    """Reorder work orders based on drag and drop - preserves user-defined order"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Update positions for all work orders
        for order_update in reorder_data.work_orders:
            cursor.execute("""
                UPDATE work_orders 
                SET position = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (order_update.position, order_update.id))
        
        conn.commit()
        conn.close()
        
        # Return updated work orders
        return await get_work_orders()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reorder error: {str(e)}")

@app.post("/api/work-orders/refresh")
async def refresh_work_orders():
    """Refresh/reload work orders from database - PRESERVES user-defined order"""
    try:
        # This endpoint refreshes data but maintains user-defined positions
        # In real production, this would sync with external systems while preserving manual adjustments
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Update the updated_at timestamp for all orders to simulate fresh data
        # But DO NOT change positions - preserve user-defined order
        cursor.execute("""
            UPDATE work_orders 
            SET updated_at = CURRENT_TIMESTAMP
        """)
        
        conn.commit()
        conn.close()
        
        # Return fresh data with preserved positions
        return await get_work_orders()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh error: {str(e)}")

@app.post("/api/work-orders/priority-sort")
async def sort_by_priority():
    """Sort work orders by priority (High -> Medium -> Low) - ONLY when explicitly requested"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Get all work orders
        cursor.execute("""
            SELECT id, priority
            FROM work_orders
            ORDER BY 
                CASE priority 
                    WHEN 'High' THEN 1 
                    WHEN 'Medium' THEN 2 
                    WHEN 'Low' THEN 3 
                    ELSE 4 
                END,
                id ASC
        """)
        
        rows = cursor.fetchall()
        
        # Update positions based on priority order
        for index, (order_id, priority) in enumerate(rows):
            cursor.execute("""
                UPDATE work_orders 
                SET position = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (index + 1, order_id))
        
        conn.commit()
        conn.close()
        
        # Return updated work orders
        return await get_work_orders()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Priority sort error: {str(e)}")

@app.get("/api/product-times")
async def get_product_times():
    """Get product processing times configuration - European production times (20min to 2hrs)"""
    # Realistic European production times: 20 minutes to 2 hours
    product_times = {
        "HydraulicPump": 105,      # 1h 45min - Complex hydraulic system
        "EngineBlock": 120,        # 2h - Heavy machining
        "TransmissionCase": 90,    # 1h 30min - Precision assembly
        "BrakeDisc": 25,           # 25min - Simple turning
        "CylinderHead": 110,       # 1h 50min - Precision machining
        "FuelInjection": 45,       # 45min - Fine tuning
        "Axle": 75,                # 1h 15min - Heavy assembly
        "Clutch": 35,              # 35min - Standard replacement
        "Turbocharger": 95,        # 1h 35min - Complex rebuild
        "Radiator": 40,            # 40min - Repair work
        "Exhaust": 20,             # 20min - Welding work
        "SteeringGear": 80,        # 1h 20min - Precision adjustment
        "Differential": 85,        # 1h 25min - Complex assembly
        "Suspension": 50,          # 50min - Component replacement
        "Electrical": 60,          # 1h - Wiring and testing
        "CoolingSystem": 55,       # 55min - System integration
        "OilPump": 70,             # 1h 10min - Pump rebuild
        "ValveTrain": 100,         # 1h 40min - Precision timing
        "IntakeManifold": 45,      # 45min - Manifold work
        "Carburetor": 65,          # 1h 5min - Rebuild process
        "Default": 60              # 1h - Default time
    }
    
    return {"product_times": product_times}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
