"""
apps/agent/state_bus.py — Inter-Agent Coordination Layer
Uses Redis for cross-agent state synchronization.
"""

import json
import logging
import os

import redis.asyncio as redis

logger = logging.getLogger("ag-visio-agent")


class StateBus:
    def __init__(self, host: str | None = None, port: int | None = None):
        self._host = host or os.environ.get("REDIS_HOST", "127.0.0.1")
        self._port = int(port if port is not None else os.environ.get("REDIS_PORT", "16379"))
        self._redis = None
        self._pubsub = None
        self._connected = False

    async def connect(self):
        try:
            self._redis = redis.Redis(host=self._host, port=self._port, decode_responses=True)
            await self._redis.ping()
            self._connected = True
            logger.info("State Bus connected to Redis at %s:%d", self._host, self._port)
        except Exception as e:
            logger.error("State Bus connection failed: %s", e)
            self._connected = False

    async def disconnect(self):
        if self._pubsub:
            await self._pubsub.unsubscribe()
            self._pubsub = None
        if self._redis:
            await self._redis.aclose()
            self._redis = None
        self._connected = False
        logger.info("State Bus disconnected")

    async def publish_state(self, agent_id: str, state: dict):
        if not self._connected or not self._redis:
            return
        payload = json.dumps({"agent_id": agent_id, "state": state})
        await self._redis.publish("ag_visio_fleet_state", payload)

    async def subscribe_to_fleet(self, callback):
        if not self._connected or not self._redis:
            return
        self._pubsub = self._redis.pubsub()
        await self._pubsub.subscribe("ag_visio_fleet_state")

        async for message in self._pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await callback(data)

    @property
    def is_connected(self) -> bool:
        return self._connected
