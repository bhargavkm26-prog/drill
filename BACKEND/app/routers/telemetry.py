import logging
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("NWIS.Telemetry")

router = APIRouter(tags=["Real-Time Telemetry"])


class ConnectionManager:
    """Manages WebSocket connections for real-time telemetry broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Active clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send telemetry data to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


# Singleton manager
manager = ConnectionManager()

# In-memory telemetry history (last 100 frames)
telemetry_history: List[dict] = []
MAX_HISTORY = 100


@router.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    WebSocket endpoint for real-time rig telemetry streaming.
    Receives telemetry frames and broadcasts to all connected dashboards.
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Store in history
            telemetry_history.append(data)
            if len(telemetry_history) > MAX_HISTORY:
                telemetry_history.pop(0)
            # Broadcast to all connected clients
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("/api/v1/telemetry/history")
async def get_telemetry_history(last_n: int = 50):
    """Get the last N telemetry frames from the in-memory buffer."""
    return {
        "total_frames": len(telemetry_history),
        "frames": telemetry_history[-last_n:]
    }
