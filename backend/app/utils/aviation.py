import math


def wind_components(wind_dir: float, wind_speed: float, runway_heading: float) -> tuple[float, float]:
    angle = math.radians(wind_dir - runway_heading)
    headwind = wind_speed * math.cos(angle)
    crosswind = wind_speed * math.sin(angle)
    return headwind, crosswind


def route_wind_component(wind_dir: float, wind_speed: float, course: float, tas: float) -> tuple[float, float, float]:
    wind_angle = math.radians(wind_dir - course)
    head_component = wind_speed * math.cos(wind_angle)
    cross_component = wind_speed * math.sin(wind_angle)
    gs = tas + head_component
    return head_component, cross_component, gs


def calculate_density_altitude(elevation_ft: float, temperature_c: float, qnh_hpa: float) -> tuple[float, float]:
    pressure_alt = elevation_ft + (1013.25 - qnh_hpa) * 30
    isa_temp = 15 - (pressure_alt / 1000) * 2
    density_alt = pressure_alt + 120 * (temperature_c - isa_temp)
    return pressure_alt, density_alt


def flight_category(visibility_m: int | None, ceiling_ft: int | None) -> str:
    if visibility_m is None and ceiling_ft is None:
        return "UNKNOWN"
    vis = visibility_m if visibility_m is not None else 99999
    ceil = ceiling_ft if ceiling_ft is not None else 99999
    if vis < 1600 or ceil < 500:
        return "LIFR"
    if vis < 5000 or ceil < 1000:
        return "IFR"
    if vis < 8000 or ceil < 3000:
        return "MVFR"
    return "VFR"


def pressure_to_altitude_ft(pressure_hpa: float) -> int:
    return int(145366.45 * (1 - (pressure_hpa / 1013.25) ** 0.190284))


def icing_risk(temperature_c: float, humidity_percent: float) -> str:
    if -20 <= temperature_c <= 0 and humidity_percent > 70:
        if humidity_percent > 90:
            return "SEVERE"
        if humidity_percent > 80:
            return "MODERATE"
        return "LIGHT"
    return "NONE"


def turbulence_risk(wind_speed_kt: float, wind_shear: float = 0) -> str:
    if wind_speed_kt > 60 or wind_shear > 8:
        return "SEVERE"
    if wind_speed_kt > 40 or wind_shear > 5:
        return "MODERATE"
    if wind_speed_kt > 25 or wind_shear > 3:
        return "LIGHT"
    return "NONE"
