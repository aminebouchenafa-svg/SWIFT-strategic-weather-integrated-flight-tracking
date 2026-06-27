from ..models.flight import FlightPlan, Waypoint, RouteSegment, GoNoGoResult, GoNoGoItem, DensityAltitude
from ..models.weather import MetarData
from ..utils.geo import haversine_nm, initial_bearing, generate_route_points
from ..utils.aviation import route_wind_component, calculate_density_altitude


AIRPORTS: dict[str, tuple[float, float, int]] = {
    "LFPG": (49.0097, 2.5479, 392), "LFPO": (48.7233, 2.3794, 291),
    "LFOB": (49.4544, 2.1128, 359), "LFPB": (48.9694, 2.4414, 218),
    "LFPT": (49.0164, 2.0781, 325), "LFPC": (49.2536, 2.5192, 291),
    "EBBR": (50.9014, 4.4844, 184), "ELLX": (49.6233, 6.2044, 1234),
    "EDDM": (48.3538, 11.7861, 1487), "EDDF": (50.0333, 8.5706, 364),
    "EGLL": (51.4700, -0.4543, 83), "EHAM": (52.3086, 4.7639, -11),
    "LEMD": (40.4719, -3.5626, 2000), "LEBL": (41.2971, 2.0785, 12),
    "LIRF": (41.8003, 12.2389, 14), "LSZH": (47.4647, 8.5492, 1416),
    "KJFK": (40.6413, -73.7781, 13), "KLAX": (33.9425, -118.4081, 128),
    "LFML": (43.4393, 5.2214, 74), "LFLL": (45.7256, 5.0811, 821),
    "LFBD": (44.8283, -0.7156, 162), "LFMN": (43.6584, 7.2159, 12),
    "LFRN": (48.0694, -1.7347, 124), "LFRS": (47.1531, -1.6108, 90),
    "LFBI": (46.5877, 0.3066, 423), "LFBZ": (43.4683, -1.5233, 245),
}


def get_airport_info(icao: str) -> tuple[float, float, int] | None:
    return AIRPORTS.get(icao.upper())


def build_flight_plan(
    departure: str,
    arrival: str,
    waypoints: list[Waypoint],
    cruise_altitude_ft: int = 5000,
    tas_kt: int = 120,
    wind_data: list | None = None,
) -> FlightPlan:
    dep_info = get_airport_info(departure)
    arr_info = get_airport_info(arrival)
    if not dep_info or not arr_info:
        return FlightPlan(departure=departure, arrival=arrival, cruise_altitude_ft=cruise_altitude_ft, true_airspeed_kt=tas_kt)

    all_points = [Waypoint(name=departure, latitude=dep_info[0], longitude=dep_info[1], altitude_ft=dep_info[2])]
    all_points.extend(waypoints)
    all_points.append(Waypoint(name=arrival, latitude=arr_info[0], longitude=arr_info[1], altitude_ft=arr_info[2]))

    segments = []
    total_dist = 0
    total_ete = 0
    for i in range(len(all_points) - 1):
        p1, p2 = all_points[i], all_points[i + 1]
        dist = haversine_nm(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
        course = initial_bearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude)

        seg = RouteSegment(
            from_point=p1, to_point=p2,
            distance_nm=round(dist, 1),
            true_course=round(course, 1),
        )

        if wind_data:
            for wd in wind_data:
                if wd.altitude_ft <= cruise_altitude_ft:
                    head, cross, gs = route_wind_component(wd.direction, wd.speed_kt, course, tas_kt)
                    seg.wind_direction = wd.direction
                    seg.wind_speed_kt = wd.speed_kt
                    seg.head_wind_kt = round(head, 1)
                    seg.cross_wind_kt = round(cross, 1)
                    seg.ground_speed_kt = round(gs, 1)
                    if gs > 0:
                        seg.ete_minutes = round(dist / gs * 60, 1)

        if seg.ground_speed_kt is None:
            seg.ground_speed_kt = float(tas_kt)
            seg.ete_minutes = round(dist / tas_kt * 60, 1)

        total_dist += dist
        total_ete += seg.ete_minutes or 0
        segments.append(seg)

    return FlightPlan(
        departure=departure,
        arrival=arrival,
        waypoints=all_points,
        cruise_altitude_ft=cruise_altitude_ft,
        true_airspeed_kt=tas_kt,
        segments=segments,
        total_distance_nm=round(total_dist, 1),
        total_ete_minutes=round(total_ete, 1),
    )


def compute_go_nogo(
    metar_dep: MetarData,
    metar_arr: MetarData,
    minimums: dict | None = None,
) -> GoNoGoResult:
    mins = minimums or {
        "ceiling_ft": 1500,
        "visibility_m": 5000,
        "max_wind_kt": 30,
        "max_gust_kt": 40,
        "max_crosswind_kt": 20,
    }
    items = []
    overall = "GO"

    for label, metar in [("Departure", metar_dep), ("Arrival", metar_arr)]:
        if metar.ceiling_ft is not None:
            status = "GO" if metar.ceiling_ft >= mins["ceiling_ft"] else ("MARGINAL" if metar.ceiling_ft >= mins["ceiling_ft"] * 0.7 else "NOGO")
            items.append(GoNoGoItem(
                category=label, parameter="Ceiling",
                current_value=f"{metar.ceiling_ft} ft",
                limit_value=f"{mins['ceiling_ft']} ft",
                status=status,
            ))
            if status == "NOGO":
                overall = "NOGO"
            elif status == "MARGINAL" and overall != "NOGO":
                overall = "MARGINAL"

        if metar.visibility_m is not None:
            status = "GO" if metar.visibility_m >= mins["visibility_m"] else ("MARGINAL" if metar.visibility_m >= mins["visibility_m"] * 0.7 else "NOGO")
            items.append(GoNoGoItem(
                category=label, parameter="Visibility",
                current_value=f"{metar.visibility_m} m",
                limit_value=f"{mins['visibility_m']} m",
                status=status,
            ))
            if status == "NOGO":
                overall = "NOGO"
            elif status == "MARGINAL" and overall != "NOGO":
                overall = "MARGINAL"

        if metar.wind:
            status = "GO" if metar.wind.speed_kt <= mins["max_wind_kt"] else ("MARGINAL" if metar.wind.speed_kt <= mins["max_wind_kt"] * 1.2 else "NOGO")
            items.append(GoNoGoItem(
                category=label, parameter="Wind",
                current_value=f"{metar.wind.speed_kt} kt",
                limit_value=f"{mins['max_wind_kt']} kt",
                status=status,
            ))
            if status == "NOGO":
                overall = "NOGO"
            elif status == "MARGINAL" and overall != "NOGO":
                overall = "MARGINAL"

            if metar.wind.gust_kt:
                status = "GO" if metar.wind.gust_kt <= mins["max_gust_kt"] else "NOGO"
                items.append(GoNoGoItem(
                    category=label, parameter="Gusts",
                    current_value=f"{metar.wind.gust_kt} kt",
                    limit_value=f"{mins['max_gust_kt']} kt",
                    status=status,
                ))
                if status == "NOGO":
                    overall = "NOGO"

    return GoNoGoResult(overall=overall, items=items)


def compute_density_altitude(metar: MetarData, elevation_ft: int) -> DensityAltitude | None:
    if metar.temperature_c is None or metar.dewpoint_c is None or metar.qnh_hpa is None:
        return None
    pressure_alt, density_alt = calculate_density_altitude(elevation_ft, metar.temperature_c, metar.qnh_hpa)
    return DensityAltitude(
        station=metar.station,
        elevation_ft=elevation_ft,
        temperature_c=metar.temperature_c,
        dewpoint_c=metar.dewpoint_c,
        qnh_hpa=metar.qnh_hpa,
        pressure_altitude_ft=round(pressure_alt),
        density_altitude_ft=round(density_alt),
    )
