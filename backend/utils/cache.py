import os
import time
import logging
import threading

logger = logging.getLogger("quantumstock.cache")

# Global variables for Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = None
use_redis = False

try:
    import redis
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    # Ping to check if Redis is active
    redis_client.ping()
    use_redis = True
    logger.info("Connected to Redis successfully.")
except Exception as e:
    logger.warning(f"Redis is unavailable or connection failed ({e}). Falling back to In-Memory Cache.")
    use_redis = False


class MemoryCache:
    """Thread-safe In-Memory Cache with key expiration times."""
    def __init__(self):
        self._store = {}
        self._expires = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> str | None:
        with self._lock:
            # Check expiration
            if key in self._expires:
                if time.time() > self._expires[key]:
                    self._delete_expired(key)
                    return None
            return self._store.get(key)

    def set(self, key: str, value: str, expire: int = None):
        with self._lock:
            self._store[key] = value
            if expire:
                self._expires[key] = time.time() + expire
            elif key in self._expires:
                del self._expires[key]

    def delete(self, key: str):
        with self._lock:
            if key in self._store:
                del self._store[key]
            if key in self._expires:
                del self._expires[key]

    def _delete_expired(self, key: str):
        if key in self._store:
            del self._store[key]
        if key in self._expires:
            del self._expires[key]


# Initialize memory fallback
memory_cache = MemoryCache()

def cache_get(key: str) -> str | None:
    """Retrieves value from active cache (Redis or Memory)."""
    if use_redis:
        try:
            return redis_client.get(key)
        except Exception as e:
            logger.error(f"Redis get failed ({e}). Falling back to memory cache.")
            return memory_cache.get(key)
    return memory_cache.get(key)

def cache_set(key: str, value: str, expire: int = None):
    """Sets value in active cache (Redis or Memory) with expiration in seconds."""
    if use_redis:
        try:
            redis_client.set(key, value, ex=expire)
            return
        except Exception as e:
            logger.error(f"Redis set failed ({e}). Falling back to memory cache.")
            memory_cache.set(key, value, expire)
    else:
        memory_cache.set(key, value, expire)

def cache_delete(key: str):
    """Deletes value from active cache (Redis or Memory)."""
    if use_redis:
        try:
            redis_client.delete(key)
            return
        except Exception as e:
            logger.error(f"Redis delete failed ({e}). Falling back to memory cache.")
            memory_cache.delete(key)
    else:
        memory_cache.delete(key)
