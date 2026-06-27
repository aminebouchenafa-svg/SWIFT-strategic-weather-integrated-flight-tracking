import httpx
from ..config import AVWX_API_URL, AVWX_API_KEY, OPEN_METEO_API_URL, PRESSURE_LEVELS
from ..models.weather import MetarData, TafData, UpperWindData, WindAloft, WeatherPoint
from ..utils.aviation import pressure_to_altitude_ft, icing_risk, turbulence_risk
from .metar_parser import parse_metar
from .taf_parser import parse_taf


async def fetch_metar(station: str) -> MetarData:
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"BEARER {AVWX_API_KEY}"} if AVWX_API_KEY else {}
        try:
            resp = await client.get(f"{AVWX_API_URL}/metar/{station}?options=info", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return parse_metar(data.get("raw", ""))
        except (httpx.HTTPError, KeyError):
            pass
        try:
            resp = await client.get(
                f"https://metar.vatsim.net/{station}",
                follow_redirects=True,
            )
            if resp.status_code == 200 and resp.text.strip():
                return parse_metar(resp.text.strip())
        except httpx.HTTPError:
            pass
    return MetarData(raw="", station=station)


async def fetch_taf(station: str) -> TafData:
    async with httpx.AsyncClient(timeout=10) as client:
        headers = {"Authorization": f"BEARER {AVWX_API_KEY}"} if AVWX_API_KEY else {}
        try:
            resp = await client.get(f"{AVWX_API_URL}/taf/{station}", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return parse_taf(data.get("raw", ""))
        except (httpx.HTTPError, KeyError):
            pass
    return TafData(raw="", station=station)


async def fetch_winds_aloft(lat: float, lon: float) -> UpperWindData:
    variables = []
    for p in PRESSURE_LEVELS:
        variables.extend([
            f"wind_speed_{p}hPa",
            f"wind_direction_{p}hPa",
            f"temperature_{p}hPa",
        ])
    hourly_str = ",".join(variables)
    url = (
        f"{OPEN_METEO_API_URL}/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&hourly={hourly_str}"
        f"&wind_speed_unit=kn&forecast_hours=1"
    )
    winds = []
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                data = resp.json()
                hourly = data.get("hourly", {})
                for pressure in PRESSURE_LEVELS:
                    speed_key = f"wind_speed_{pressure}hPa"
                    dir_key = f"wind_direction_{pressure}hPa"
                    temp_key = f"temperature_{pressure}hPa"
                    speed_vals = hourly.get(speed_key, [])
                    dir_vals = hourly.get(dir_key, [])
                    temp_vals = hourly.get(temp_key, [])
                    if speed_vals and dir_vals and temp_vals:
                        winds.append(WindAloft(
                            altitude_ft=pressure_to_altitude_ft(pressure),
                            pressure_hpa=pressure,
                            direction=int(dir_vals[0] or 0),
                            speed_kt=float(speed_vals[0] or 0),
                            temperature_c=float(temp_vals[0] or 0),
                        ))
        except httpx.HTTPError:
            pass
    return UpperWindData(latitude=lat, longitude=lon, winds=sorted(winds, key=lambda w: w.altitude_ft))


async def fetch_route_weather(points: list[tuple[float, float]], altitude_ft: int) -> list[WeatherPoint]:
    if not points:
        return []
    lats = ",".join(f"{p[0]:.4f}" for p in points)
    lons = ",".join(f"{p[1]:.4f}" for p in points)
    url = (
        f"{OPEN_METEO_API_URL}/forecast?"
        f"latitude={lats}&longitude={lons}"
        f"&hourly=temperature_850hPa,relative_humidity_850hPa,"
        f"wind_speed_850hPa,wind_direction_850hPa,cloud_cover"
        f"&wind_speed_unit=kn&forecast_hours=1"
    )
    weather_points = []
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                data = resp.json()
                results = data if isinstance(data, list) else [data]
                for i, result in enumerate(results):
                    if i >= len(points):
                        break
                    hourly = result.get("hourly", {})
                    temp = _first_val(hourly, "temperature_850hPa")
                    humidity = _first_val(hourly, "relative_humidity_850hPa")
                    wind_speed = _first_val(hourly, "wind_speed_850hPa")
                    wind_dir = _first_val(hourly, "wind_direction_850hPa")
                    cloud = _first_val(hourly, "cloud_cover")
                    wp = WeatherPoint(
                        latitude=points[i][0],
                        longitude=points[i][1],
                        altitude_ft=altitude_ft,
                        temperature_c=temp,
                        humidity_percent=humidity,
                        wind_direction=int(wind_dir) if wind_dir else None,
                        wind_speed_kt=wind_speed,
                        cloud_cover_percent=cloud,
                    )
                    if temp is not None and humidity is not None:
                        wp.icing_risk = icing_risk(temp, humidity)
                    if wind_speed is not None:
                        wp.turbulence_risk = turbulence_risk(wind_speed)
                    weather_points.append(wp)
        except httpx.HTTPError:
            pass
    return weather_points


def _first_val(hourly: dict, key: str):
    vals = hourly.get(key, [])
    return vals[0] if vals else None
