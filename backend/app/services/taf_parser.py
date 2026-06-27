import re
from datetime import datetime, timezone
from ..models.weather import TafData, TafForecast, WindInfo, CloudLayer, WeatherPhenomenon
from .metar_parser import _parse_wind, _parse_visibility, _parse_weather, _parse_cloud


def parse_taf(raw: str) -> TafData:
    raw = raw.strip()
    taf = TafData(raw=raw, station="")
    lines = re.split(r"\s+", raw)
    if not lines:
        return taf
    idx = 0
    if lines[idx] in ("TAF", "TAF AMD"):
        idx += 1
    if idx < len(lines) and lines[idx] == "AMD":
        idx += 1
    if idx < len(lines):
        taf.station = lines[idx]
        idx += 1
    if idx < len(lines):
        time_match = re.match(r"(\d{2})(\d{2})(\d{2})Z", lines[idx])
        if time_match:
            now = datetime.now(timezone.utc)
            day, hour, minute = int(time_match.group(1)), int(time_match.group(2)), int(time_match.group(3))
            try:
                taf.issued = now.replace(day=day, hour=hour, minute=minute, second=0, microsecond=0)
            except ValueError:
                pass
            idx += 1
    if idx < len(lines):
        validity_match = re.match(r"(\d{2})(\d{2})/(\d{2})(\d{2})", lines[idx])
        if validity_match:
            now = datetime.now(timezone.utc)
            try:
                taf.valid_from = now.replace(
                    day=int(validity_match.group(1)),
                    hour=int(validity_match.group(2)),
                    minute=0, second=0, microsecond=0
                )
                taf.valid_to = now.replace(
                    day=int(validity_match.group(3)),
                    hour=int(validity_match.group(4)),
                    minute=0, second=0, microsecond=0
                )
            except ValueError:
                pass
            idx += 1
    current_forecast = TafForecast(type="BASE")
    while idx < len(lines):
        token = lines[idx]
        if token.startswith("BECMG") or token == "BECMG":
            if current_forecast.wind or current_forecast.clouds:
                taf.forecasts.append(current_forecast)
            current_forecast = TafForecast(type="BECMG")
            idx += 1
            if idx < len(lines):
                _parse_change_period(lines[idx], current_forecast)
                idx += 1
            continue
        if token.startswith("TEMPO") or token == "TEMPO":
            if current_forecast.wind or current_forecast.clouds:
                taf.forecasts.append(current_forecast)
            current_forecast = TafForecast(type="TEMPO")
            idx += 1
            if idx < len(lines):
                _parse_change_period(lines[idx], current_forecast)
                idx += 1
            continue
        prob_match = re.match(r"PROB(\d{2})", token)
        if prob_match:
            if current_forecast.wind or current_forecast.clouds:
                taf.forecasts.append(current_forecast)
            current_forecast = TafForecast(type="PROB", probability=int(prob_match.group(1)))
            idx += 1
            continue
        fm_match = re.match(r"FM(\d{2})(\d{2})(\d{2})", token)
        if fm_match:
            if current_forecast.wind or current_forecast.clouds:
                taf.forecasts.append(current_forecast)
            current_forecast = TafForecast(type="FM")
            now = datetime.now(timezone.utc)
            try:
                current_forecast.from_time = now.replace(
                    day=int(fm_match.group(1)),
                    hour=int(fm_match.group(2)),
                    minute=int(fm_match.group(3)),
                    second=0, microsecond=0
                )
            except ValueError:
                pass
            idx += 1
            continue
        wind = _parse_wind(token)
        if wind:
            current_forecast.wind = wind
            idx += 1
            continue
        vis = _parse_visibility(token)
        if vis is not None:
            current_forecast.visibility_m = vis
            idx += 1
            continue
        if token == "CAVOK":
            current_forecast.visibility_m = 9999
            idx += 1
            continue
        wx = _parse_weather(token)
        if wx:
            current_forecast.weather.append(wx)
            idx += 1
            continue
        cloud = _parse_cloud(token)
        if cloud:
            current_forecast.clouds.append(cloud)
            idx += 1
            continue
        idx += 1
    if current_forecast.wind or current_forecast.clouds or current_forecast.visibility_m:
        taf.forecasts.append(current_forecast)
    return taf


def _parse_change_period(token: str, forecast: TafForecast):
    match = re.match(r"(\d{2})(\d{2})/(\d{2})(\d{2})", token)
    if match:
        now = datetime.now(timezone.utc)
        try:
            forecast.from_time = now.replace(
                day=int(match.group(1)), hour=int(match.group(2)),
                minute=0, second=0, microsecond=0
            )
            forecast.to_time = now.replace(
                day=int(match.group(3)), hour=int(match.group(4)),
                minute=0, second=0, microsecond=0
            )
        except ValueError:
            pass
