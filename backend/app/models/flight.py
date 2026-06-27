from pydantic import BaseModel
from typing import Optional


class Waypoint(BaseModel):
    name: str
    latitude: float
    longitude: float
    altitude_ft: Optional[int] = None


class RouteSegment(BaseModel):
    from_point: Waypoint
    to_point: Waypoint
    distance_nm: float
    true_course: float
    magnetic_course: Optional[float] = None
    wind_direction: Optional[int] = None
    wind_speed_kt: Optional[float] = None
    head_wind_kt: Optional[float] = None
    cross_wind_kt: Optional[float] = None
    ground_speed_kt: Optional[float] = None
    ete_minutes: Optional[float] = None


class FlightPlan(BaseModel):
    departure: str
    arrival: str
    waypoints: list[Waypoint] = []
    cruise_altitude_ft: int = 5000
    true_airspeed_kt: int = 120
    segments: list[RouteSegment] = []
    total_distance_nm: float = 0
    total_ete_minutes: float = 0


class GoNoGoItem(BaseModel):
    category: str
    parameter: str
    current_value: str
    limit_value: str
    status: str  # GO, MARGINAL, NOGO


class GoNoGoResult(BaseModel):
    overall: str  # GO, MARGINAL, NOGO
    items: list[GoNoGoItem] = []


class DensityAltitude(BaseModel):
    station: str
    elevation_ft: int
    temperature_c: float
    dewpoint_c: float
    qnh_hpa: float
    pressure_altitude_ft: float
    density_altitude_ft: float
