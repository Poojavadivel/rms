import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR / 'app' / '.env')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db, get_db
from .scheduler import start_scheduler, shutdown_scheduler

# ── Admin route modules ──
from .admin.routes import settings as settings_router
from .admin.routes import staff as staff_router
from .admin.routes import audit as audit_router
from .admin.routes import menu as admin_menu_router
from .admin.routes import orders as admin_orders_router
from .admin.routes import tables as tables_router
from .admin.routes import inventory as inventory_router
from .admin.routes import customers as customers_router
from .admin.routes import offers as admin_offers_router
from .admin.routes import notifications as admin_notif_router
from .admin.routes import billing as billing_router
from .admin.routes import analytics as analytics_router
from .admin.routes import recipes as recipes_router
from .admin.routes import catalog as catalog_router
from .admin.routes import workflow as workflow_router

# ── Client route modules ──
from .client.routes import auth as client_auth_router
from .client.routes import menu as client_menu_router
from .client.routes import orders as client_orders_router
from .client.routes import reservations as client_reservations_router
from .client.routes import queue as client_queue_router
from .client.routes import offers as client_offers_router
from .client.routes import notifications as client_notif_router
from .client.routes import feedback as client_feedback_router
from .client.routes import chat as client_chat_router
from .client.routes import health as client_health_router
from .client.routes import stats as client_stats_router


app = FastAPI(title='RMS Backend — Unified API')

@app.get("/")
async def root():
    return {"message": "RMS Unified Backend API is running", "docs": "/docs", "health": "/api/health"}

# CORS
cors_env = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')
origins = [o.strip() for o in cors_env.split(',') if o.strip()]
allow_all = '*' in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=not allow_all,   # credentials + wildcard is invalid
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Lifecycle ──
@app.on_event('startup')
async def startup():
    try:
        init_db()
        print("✅ MongoDB connected successfully")
        await start_scheduler()
    except Exception as e:
        print(f"⚠️  MongoDB connection warning: {e}")
        print("📝 API will work in read-only mode or with mock data")


@app.on_event('shutdown')
async def shutdown():
    shutdown_scheduler()


# ═══════════════════════════════════════════════════════════════
# ADMIN routes  —  /api/admin/...
# ═══════════════════════════════════════════════════════════════
app.include_router(settings_router.router,     prefix='/api/admin/settings',       tags=["Admin - Settings"])
app.include_router(staff_router.router,        prefix='/api/admin/staff',          tags=["Admin - Staff"])
app.include_router(audit_router.router,        prefix='/api/admin/audit',          tags=["Admin - Audit"])
app.include_router(catalog_router.router,      prefix='/api/admin/catalog',        tags=["Admin - Catalog"])
app.include_router(admin_menu_router.router,   prefix='/api/admin/menu',           tags=["Admin - Menu"])
app.include_router(admin_orders_router.router, prefix='/api/admin/orders',         tags=["Admin - Orders"])
app.include_router(tables_router.router,       prefix='/api/admin/tables',         tags=["Admin - Tables"])
app.include_router(inventory_router.router,    prefix='/api/admin/inventory',      tags=["Admin - Inventory"])
app.include_router(recipes_router.router,      prefix='/api/admin/recipes',        tags=["Admin - Recipes"])
app.include_router(customers_router.router,    prefix='/api/admin/customers',      tags=["Admin - Customers"])
app.include_router(admin_offers_router.router, prefix='/api/admin/offers',         tags=["Admin - Offers"])
app.include_router(admin_notif_router.router,  prefix='/api/admin/notifications',  tags=["Admin - Notifications"])
app.include_router(billing_router.router,      prefix='/api/admin/billing',        tags=["Admin - Billing"])
app.include_router(analytics_router.router,    prefix='/api/admin/analytics',      tags=["Admin - Analytics"])
app.include_router(workflow_router.router,     prefix='/api/admin/workflow',       tags=["Admin - Workflow"])

# ═══════════════════════════════════════════════════════════════
# CLIENT routes  —  /api/client/...
# ═══════════════════════════════════════════════════════════════
app.include_router(client_auth_router.router,          prefix='/api/client',              tags=["Client - Auth"])
app.include_router(client_menu_router.router,          prefix='/api/client',              tags=["Client - Menu"])
app.include_router(client_orders_router.router,        prefix='/api/client',              tags=["Client - Orders"])
app.include_router(client_reservations_router.router,  prefix='/api/client',              tags=["Client - Reservations"])
app.include_router(client_queue_router.router,         prefix='/api/client',              tags=["Client - Queue"])
app.include_router(client_offers_router.router,        prefix='/api/client',              tags=["Client - Offers"])
app.include_router(client_notif_router.router,         prefix='/api/client',              tags=["Client - Notifications"])
app.include_router(client_feedback_router.router,      prefix='/api/client',              tags=["Client - Feedback"])
app.include_router(client_chat_router.router,          prefix='/api/client',              tags=["Client - Chat"])
app.include_router(client_health_router.router,        prefix='/api/client',              tags=["Client - Health"])
app.include_router(client_stats_router.router,         prefix='/api/client',              tags=["Client - Stats"])


# ═══════════════════════════════════════════════════════════════
# Shared endpoints
# ═══════════════════════════════════════════════════════════════
@app.get('/api/health')
async def health_check():
    return {
        "status": "healthy",
        "service": "RMS Unified Backend",
        "version": "2.0.0",
    }


@app.post('/api/seed')
async def seed_database(secret: str = ''):
    """Seed the database with sample data. Requires SEED_SECRET env var."""
    from fastapi import HTTPException
    from datetime import datetime
    from passlib.hash import pbkdf2_sha256
    import bcrypt

    expected_secret = os.getenv('SEED_SECRET', 'seed123')
    if secret != expected_secret:
        raise HTTPException(status_code=403, detail='Invalid secret')

    try:
        db = get_db()
    except RuntimeError:
        init_db()
        db = get_db()

    results = {"staff": 0, "users": 0, "client_offers": 0, "tables": 0, "time_slots": 0, "errors": []}

    # ── Staff seed ──
    staff_data = [
        {"name": "Admin User",   "email": "admin@restaurant.com",   "phone": "+91 98765 00001", "role": "admin",   "password": "admin123"},
        {"name": "Manager User", "email": "manager@restaurant.com", "phone": "+91 98765 00002", "role": "manager", "password": "manager123"},
        {"name": "Chef User",    "email": "chef@restaurant.com",    "phone": "+91 98765 00003", "role": "chef",    "password": "chef123"},
        {"name": "Waiter User",  "email": "waiter@restaurant.com",  "phone": "+91 98765 00004", "role": "waiter",  "password": "waiter123"},
        {"name": "Cashier User", "email": "cashier@restaurant.com", "phone": "+91 98765 00005", "role": "cashier", "password": "cashier123"},
    ]
    try:
        staff_coll = db.get_collection('staff')
        for s in staff_data:
            existing = await staff_coll.find_one({"email": s["email"].lower()})
            if not existing:
                await staff_coll.insert_one({
                    "name": s["name"], "email": s["email"].lower(), "phone": s["phone"],
                    "role": s["role"], "password_hash": pbkdf2_sha256.hash(s["password"]),
                    "active": True, "createdAt": datetime.utcnow(),
                })
                results["staff"] += 1
    except Exception as e:
        results["errors"].append(f"staff: {e}")

    # ── Mobile users seed ──
    users_data = [
        {"name": "Admin User", "email": "admin@restaurant.com", "phone": "+91 98765 00001", "address": "123 Main St", "password": "admin123"},
    ]
    try:
        users_coll = db.get_collection('users')
        for u in users_data:
            existing = await users_coll.find_one({"email": u["email"].lower()})
            if not existing:
                password_hash = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
                await users_coll.insert_one({
                    "name": u["name"],
                    "email": u["email"].lower(),
                    "phone": u["phone"],
                    "address": u["address"],
                    "passwordHash": password_hash,
                    "loyaltyPoints": 1000,
                    "favorites": [],
                    "membership": {
                        "plan": "platinum",
                        "status": "active",
                        "monthlyPrice": 0,
                        "pointsBoost": 50,
                        "benefits": ["All-access", "Priority Seating"],
                        "expiryDate": "2026-12-31"
                    },
                    "createdAt": datetime.utcnow().isoformat() + "Z",
                    "updatedAt": datetime.utcnow().isoformat() + "Z",
                })
                results["users"] += 1
    except Exception as e:
        results["errors"].append(f"users: {e}")

    # ── Client offers seed (migrated from SQLite) ──
    offers_data = [
        {"id": "OFF10",  "title": "10% Off on orders above ₹300",   "type": "PERCENT", "value": 10, "minOrderValue": 300, "requiresLoyalty": False},
        {"id": "FLAT50", "title": "Flat ₹50 Off on orders above ₹500", "type": "FLAT",   "value": 50, "minOrderValue": 500, "requiresLoyalty": False},
        {"id": "LOYAL20","title": "20% Off for Loyalty Members",     "type": "PERCENT", "value": 20, "minOrderValue": 0,   "requiresLoyalty": True},
    ]
    try:
        offers_coll = db.get_collection('client_offers')
        for o in offers_data:
            existing = await offers_coll.find_one({"id": o["id"]})
            if not existing:
                await offers_coll.insert_one(o)
                results["client_offers"] += 1
    except Exception as e:
        results["errors"].append(f"client_offers: {e}")

    # ── Tables seed ──
    tables_data = []
    halls = [
        ("VIP Hall",  "Premium", [2, 4]),
        ("AC Hall",   "Regular", [2, 4, 6]),
        ("Main Hall", "Economy", [4, 6, 8]),
    ]
    tid = 1
    for hall, segment, caps in halls:
        for cap in caps:
            tables_data.append({
                "tableId": tid, "tableName": f"Table {tid}",
                "location": hall, "segment": segment, "capacity": cap,
                "status": "available",
            })
            tid += 1
    try:
        tables_coll = db.get_collection('tables')
        for t in tables_data:
            existing = await tables_coll.find_one({"tableId": t["tableId"]})
            if not existing:
                await tables_coll.insert_one(t)
                results["tables"] += 1
    except Exception as e:
        results["errors"].append(f"tables: {e}")

    # ── Reservation time slots seed ──
    time_slots_data = [
        {"label": "7:30 AM – 8:50 AM",  "startTime": "07:30", "endTime": "08:50"},
        {"label": "9:10 AM – 10:30 AM", "startTime": "09:10", "endTime": "10:30"},
        {"label": "12:00 PM – 1:20 PM", "startTime": "12:00", "endTime": "13:20"},
        {"label": "1:40 PM – 3:00 PM",  "startTime": "13:40", "endTime": "15:00"},
        {"label": "6:40 PM – 8:00 PM",  "startTime": "18:40", "endTime": "20:00"},
        {"label": "8:20 PM – 9:40 PM",  "startTime": "20:20", "endTime": "21:40"},
    ]
    try:
        ts_coll = db.get_collection('reservation_time_slots')
        for ts in time_slots_data:
            existing = await ts_coll.find_one({"label": ts["label"]})
            if not existing:
                await ts_coll.insert_one({**ts, "createdAt": datetime.utcnow()})
                results["time_slots"] += 1
    except Exception as e:
        results["errors"].append(f"time_slots: {e}")

    return {"success": True, "message": "Database seeded", "created": results}


if __name__ == '__main__':
    import uvicorn
    host = os.getenv('FASTAPI_HOST', '0.0.0.0')
    port = int(os.getenv('FASTAPI_PORT', 8000))
    uvicorn.run('app.main:app', host=host, port=port, reload=True)
