from fastapi import APIRouter
from pydantic import BaseModel
from ..models.flight import Waypoint
from ..services.route_service import build_flight_plan, compute_go_nogo, get_airport_info, AIRPORTS
from ..services.weather_service import fetch_metar, fetch_winds_aloft

router = APIRouter(prefix="/api/flight", tags=["flight"])


class FlightPlanRequest(BaseModel):
    departure: str
    arrival: str
    waypoints: list[Waypoint] = []
    cruise_altitude_ft: int = 5000
    true_airspeed_kt: int = 120


class GoNoGoRequest(BaseModel):
    departure: str
    arrival: str
    minimums: dict | None = None


@router.post("/plan")
async def create_flight_plan(req: FlightPlanRequest):
    dep_info = get_airport_info(req.departure)
    wind_data = None
    if dep_info:
        winds = await fetch_winds_aloft(dep_info[0], dep_info[1])
        wind_data = winds.winds

    plan = build_flight_plan(
        departure=req.departure,
        arrival=req.arrival,
        waypoints=req.waypoints,
        cruise_altitude_ft=req.cruise_altitude_ft,
        tas_kt=req.true_airspeed_kt,
        wind_data=wind_data,
    )
    return plan


@router.post("/go-nogo")
async def go_nogo_check(req: GoNoGoRequest):
    metar_dep = await fetch_metar(req.departure)
    metar_arr = await fetch_metar(req.arrival)
    result = compute_go_nogo(metar_dep, metar_arr, req.minimums)
    return result


@router.get("/airports")
async def list_airports():
    return [
        {
            "icao": icao,
            "latitude": coords[0],
            "longitude": coords[1],
            "elevation_ft": coords[2],
        }
        for icao, coords in AIRPORTS.items()
    ]
