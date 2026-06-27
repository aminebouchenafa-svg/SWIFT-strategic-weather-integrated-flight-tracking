from fastapi import APIRouter, HTTPException
from ..services.weather_service import fetch_metar, fetch_taf, fetch_winds_aloft, fetch_route_weather
from ..services.metar_parser import parse_metar
from ..services.taf_parser import parse_taf
from ..services.route_service import compute_density_altitude, get_airport_info

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/metar/{station}")
async def get_metar(station: str):
    station = station.upper().strip()
    if len(station) != 4:
        raise HTTPException(400, "Station ICAO code must be 4 characters")
    metar = await fetch_metar(station)
    return metar


@router.get("/taf/{station}")
async def get_taf(station: str):
    station = station.upper().strip()
    if len(station) != 4:
        raise HTTPException(400, "Station ICAO code must be 4 characters")
    taf = await fetch_taf(station)
    return taf


@router.get("/winds-aloft")
async def get_winds_aloft(lat: float, lon: float):
    winds = await fetch_winds_aloft(lat, lon)
    return winds


@router.get("/route-weather")
async def get_route_weather(
    dep_lat: float, dep_lon: float,
    arr_lat: float, arr_lon: float,
    altitude_ft: int = 5000,
    num_points: int = 8,
):
    from ..utils.geo import generate_route_points
    points = generate_route_points(dep_lat, dep_lon, arr_lat, arr_lon, num_points)
    weather = await fetch_route_weather(points, altitude_ft)
    return weather


@router.post("/parse-metar")
async def parse_metar_raw(raw: str):
    return parse_metar(raw)


@router.post("/parse-taf")
async def parse_taf_raw(raw: str):
    return parse_taf(raw)


@router.get("/density-altitude/{station}")
async def get_density_altitude(station: str):
    station = station.upper().strip()
    metar = await fetch_metar(station)
    info = get_airport_info(station)
    if not info:
        raise HTTPException(404, f"Airport {station} not found in database")
    result = compute_density_altitude(metar, info[2])
    if not result:
        raise HTTPException(422, "Insufficient METAR data for density altitude calculation")
    return result
