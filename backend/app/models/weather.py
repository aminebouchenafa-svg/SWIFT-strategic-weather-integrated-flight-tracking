from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CloudLayer(BaseModel):
    coverage: str
    altitude_ft: int
    cloud_type: Optional[str] = None


class WindInfo(BaseModel):
    direction: Optional[int] = None
    speed_kt: int
    gust_kt: Optional[int] = None
    variable: bool = False
    variable_from: Optional[int] = None
    variable_to: Optional[int] = None


class WeatherPhenomenon(BaseModel):
    intensity: str = ""
    descriptor: str = ""
    phenomena: str = ""
    raw: str = ""


class MetarData(BaseModel):
    raw: str
    station: str
    time: Optional[datetime] = None
    wind: Optional[WindInfo] = None
    visibility_m: Optional[int] = None
    weather: list[WeatherPhenomenon] = []
    clouds: list[CloudLayer] = []
    temperature_c: Optional[int] = None
    dewpoint_c: Optional[int] = None
    qnh_hpa: Optional[float] = None
    flight_category: str = "UNKNOWN"
    ceiling_ft: Optional[int] = None


class TafForecast(BaseModel):
    type: str = "BASE"
    from_time: Optional[datetime] = None
    to_time: Optional[datetime] = None
    probability: Optional[int] = None
    wind: Optional[WindInfo] = None
    visibility_m: Optional[int] = None
    weather: list[WeatherPhenomenon] = []
    clouds: list[CloudLayer] = []


class TafData(BaseModel):
    raw: str
    station: str
    issued: Optional[datetime] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    forecasts: list[TafForecast] = []


class WindAloft(BaseModel):
    altitude_ft: int
    pressure_hpa: int
    direction: int
    speed_kt: float
    temperature_c: float


class UpperWindData(BaseModel):
    latitude: float
    longitude: float
    winds: list[WindAloft] = []


class WeatherPoint(BaseModel):
    latitude: float
    longitude: float
    altitude_ft: int
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    wind_direction: Optional[int] = None
    wind_speed_kt: Optional[float] = None
    cloud_cover_percent: Optional[float] = None
    icing_risk: str = "NONE"
    turbulence_risk: str = "NONE"
