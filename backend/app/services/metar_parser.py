import re
from datetime import datetime, timezone
from ..models.weather import MetarData, WindInfo, CloudLayer, WeatherPhenomenon
from ..utils.aviation import flight_category

WEATHER_DESCRIPTORS = {"MI", "PR", "BC", "DR", "BL", "SH", "TS", "FZ"}
WEATHER_PHENOMENA = {
    "DZ": "Drizzle", "RA": "Rain", "SN": "Snow", "SG": "Snow Grains",
    "IC": "Ice Crystals", "PL": "Ice Pellets", "GR": "Hail", "GS": "Small Hail",
    "UP": "Unknown Precipitation", "BR": "Mist", "FG": "Fog", "FU": "Smoke",
    "VA": "Volcanic Ash", "DU": "Dust", "SA": "Sand", "HZ": "Haze",
    "PO": "Dust Whirls", "SQ": "Squalls", "FC": "Funnel Cloud",
    "SS": "Sandstorm", "DS": "Duststorm",
}
CLOUD_COVERAGE = {"FEW": "Few", "SCT": "Scattered", "BKN": "Broken", "OVC": "Overcast"}


def parse_metar(raw: str) -> MetarData:
    raw = raw.strip()
    metar = MetarData(raw=raw, station="")
    tokens = raw.split()
    if not tokens:
        return metar
    idx = 0
    if tokens[idx] == "METAR" or tokens[idx] == "SPECI":
        idx += 1
    if idx < len(tokens):
        metar.station = tokens[idx]
        idx += 1
    if idx < len(tokens):
        time_match = re.match(r"(\d{2})(\d{2})(\d{2})Z", tokens[idx])
        if time_match:
            day, hour, minute = int(time_match.group(1)), int(time_match.group(2)), int(time_match.group(3))
            now = datetime.now(timezone.utc)
            try:
                metar.time = now.replace(day=day, hour=hour, minute=minute, second=0, microsecond=0)
            except ValueError:
                pass
            idx += 1
    if idx < len(tokens):
        metar.wind = _parse_wind(tokens[idx])
        if metar.wind:
            idx += 1
            if idx < len(tokens) and re.match(r"\d{3}V\d{3}", tokens[idx]):
                var_match = re.match(r"(\d{3})V(\d{3})", tokens[idx])
                if var_match:
                    metar.wind.variable_from = int(var_match.group(1))
                    metar.wind.variable_to = int(var_match.group(2))
                idx += 1
    while idx < len(tokens):
        vis = _parse_visibility(tokens[idx])
        if vis is not None:
            metar.visibility_m = vis
            idx += 1
            break
        if tokens[idx] == "CAVOK":
            metar.visibility_m = 9999
            idx += 1
            break
        idx += 1
        break
    while idx < len(tokens):
        wx = _parse_weather(tokens[idx])
        if wx:
            metar.weather.append(wx)
            idx += 1
        else:
            break
    while idx < len(tokens):
        cloud = _parse_cloud(tokens[idx])
        if cloud:
            metar.clouds.append(cloud)
            idx += 1
        elif tokens[idx] in ("NSC", "NCD", "SKC", "CLR"):
            idx += 1
        else:
            break
    while idx < len(tokens):
        temp = _parse_temp_dewpoint(tokens[idx])
        if temp is not None:
            metar.temperature_c, metar.dewpoint_c = temp
            idx += 1
            break
        idx += 1
    while idx < len(tokens):
        qnh = _parse_qnh(tokens[idx])
        if qnh is not None:
            metar.qnh_hpa = qnh
            idx += 1
            break
        idx += 1
    ceiling = None
    for cloud in metar.clouds:
        if cloud.coverage in ("BKN", "OVC"):
            if ceiling is None or cloud.altitude_ft < ceiling:
                ceiling = cloud.altitude_ft
    metar.ceiling_ft = ceiling
    metar.flight_category = flight_category(metar.visibility_m, ceiling)
    return metar


def _parse_wind(token: str) -> WindInfo | None:
    match = re.match(r"(VRB|\d{3})(\d{2,3})(G(\d{2,3}))?(KT|MPS)", token)
    if not match:
        return None
    direction = None if match.group(1) == "VRB" else int(match.group(1))
    speed = int(match.group(2))
    gust = int(match.group(4)) if match.group(4) else None
    if match.group(5) == "MPS":
        speed = int(speed * 1.944)
        if gust:
            gust = int(gust * 1.944)
    return WindInfo(
        direction=direction,
        speed_kt=speed,
        gust_kt=gust,
        variable=match.group(1) == "VRB",
    )


def _parse_visibility(token: str) -> int | None:
    if re.match(r"^\d{4}$", token):
        return int(token)
    match = re.match(r"^(\d+)SM$", token)
    if match:
        return int(int(match.group(1)) * 1609.34)
    return None


def _parse_weather(token: str) -> WeatherPhenomenon | None:
    match = re.match(r"^([+-]?)((?:MI|PR|BC|DR|BL|SH|TS|FZ)*)(.+)$", token)
    if not match:
        return None
    intensity = match.group(1)
    descriptor = match.group(2)
    phenom = match.group(3)
    if not any(phenom[i:i+2] in WEATHER_PHENOMENA for i in range(0, len(phenom), 2)):
        return None
    return WeatherPhenomenon(intensity=intensity, descriptor=descriptor, phenomena=phenom, raw=token)


def _parse_cloud(token: str) -> CloudLayer | None:
    match = re.match(r"(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?", token)
    if not match:
        return None
    return CloudLayer(
        coverage=match.group(1),
        altitude_ft=int(match.group(2)) * 100,
        cloud_type=match.group(3),
    )


def _parse_temp_dewpoint(token: str) -> tuple[int, int] | None:
    match = re.match(r"^(M?\d{2})/(M?\d{2})$", token)
    if not match:
        return None
    temp = int(match.group(1).replace("M", "-"))
    dewpoint = int(match.group(2).replace("M", "-"))
    return temp, dewpoint


def _parse_qnh(token: str) -> float | None:
    match = re.match(r"^Q(\d{4})$", token)
    if match:
        return float(match.group(1))
    match = re.match(r"^A(\d{4})$", token)
    if match:
        return float(match.group(1)) / 100 * 33.8639
    return None
