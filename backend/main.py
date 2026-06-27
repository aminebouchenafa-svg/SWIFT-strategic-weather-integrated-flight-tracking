from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.api.weather import router as weather_router
from app.api.routes import router as flight_router

app = FastAPI(
    title="SWIFT - Strategic Weather Integrated Flight Tracking",
    version="0.1.0",
    description="Aviation weather and flight planning API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(weather_router)
app.include_router(flight_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "SWIFT"}
