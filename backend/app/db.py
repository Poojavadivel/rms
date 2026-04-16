from motor.motor_asyncio import AsyncIOMotorClient
import os

_client = None
db = None

def init_db(uri: str = None):
    global _client, db
    if _client is not None:
        return db

    if uri is None:
        uri = os.getenv('MONGODB_URI')

    # Prefer a real MongoDB instance when URI is configured.
    if uri:
        _client = AsyncIOMotorClient(uri)
        # Try to get database from URI, fallback to 'restaurant_db'
        default_db = _client.get_default_database()
        if default_db is not None:
            db = default_db
        else:
            db = _client['restaurant_db']
        return db

    # If no URI is set, fall back to an in-memory mock DB for local/dev usage.
    try:
        from mongomock_motor import AsyncMongoMockClient
        _client = AsyncMongoMockClient()
        db = _client['restaurant_db']
        print("✅ Using MongoMock for local testing (No MongoDB required)")
        return db
    except ImportError as exc:
        raise RuntimeError('MONGODB_URI must be set (or install mongomock-motor for local mock DB)') from exc


def get_db():
    """Get the database instance"""
    global db
    if db is None:
        try:
            init_db()
        except Exception as exc:
            raise RuntimeError('Database not initialized. Unable to connect to database.') from exc
    return db
