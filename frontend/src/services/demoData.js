import AIRPORTS_LIST from '../data/airports'

export const DEMO_AIRPORTS = Object.fromEntries(
  AIRPORTS_LIST.map(a => [a.icao, { icao: a.icao, name: a.name, latitude: a.lat, longitude: a.lon, elevation_ft: a.elev }])
)

function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function initialBearing(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180
  const toDeg = r => r * 180 / Math.PI
  const dLon = toRad(lon2 - lon1)
  const x = Math.sin(dLon) * Math.cos(toRad(lat2))
  const y = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (toDeg(Math.atan2(x, y)) + 360) % 360
}

function demoWind(alt) {
  const base = 220 + Math.random() * 40
  const speed = 5 + (alt / 1000) * 3 + Math.random() * 10
  const temp = 15 - (alt / 1000) * 2 + (Math.random() - 0.5) * 4
  return { direction: Math.round(base) % 360, speed: Math.round(speed * 10) / 10, temp: Math.round(temp * 10) / 10 }
}

export function generateDemoFlightPlan(departure, arrival, cruiseAlt, tas) {
  const dep = DEMO_AIRPORTS[departure]
  const arr = DEMO_AIRPORTS[arrival]
  if (!dep || !arr) return null

  const dist = Math.round(haversineNm(dep.latitude, dep.longitude, arr.latitude, arr.longitude) * 10) / 10
  const course = Math.round(initialBearing(dep.latitude, dep.longitude, arr.latitude, arr.longitude) * 10) / 10
  const w = demoWind(cruiseAlt)
  const windAngle = (w.direction - course) * Math.PI / 180
  const headWind = Math.round(w.speed * Math.cos(windAngle) * 10) / 10
  const crossWind = Math.round(w.speed * Math.sin(windAngle) * 10) / 10
  const gs = Math.round((tas + headWind) * 10) / 10
  const ete = Math.round(dist / gs * 60 * 10) / 10

  return {
    departure, arrival,
    waypoints: [
      { name: departure, latitude: dep.latitude, longitude: dep.longitude, altitude_ft: dep.elevation_ft },
      { name: arrival, latitude: arr.latitude, longitude: arr.longitude, altitude_ft: arr.elevation_ft },
    ],
    cruise_altitude_ft: cruiseAlt,
    true_airspeed_kt: tas,
    segments: [{
      from_point: { name: departure, latitude: dep.latitude, longitude: dep.longitude, altitude_ft: dep.elevation_ft },
      to_point: { name: arrival, latitude: arr.latitude, longitude: arr.longitude, altitude_ft: arr.elevation_ft },
      distance_nm: dist, true_course: course,
      wind_direction: w.direction, wind_speed_kt: w.speed,
      head_wind_kt: headWind, cross_wind_kt: crossWind,
      ground_speed_kt: gs, ete_minutes: ete,
    }],
    total_distance_nm: dist,
    total_ete_minutes: ete,
  }
}

export function generateDemoMetar(station) {
  const ap = DEMO_AIRPORTS[station]
  if (!ap) return null
  const dir = Math.round(Math.random() * 36) * 10
  const spd = Math.round(3 + Math.random() * 15)
  const gust = Math.random() > 0.7 ? spd + Math.round(5 + Math.random() * 10) : null
  const vis = Math.random() > 0.2 ? 9999 : Math.round(2000 + Math.random() * 6000)
  const temp = Math.round(15 + Math.random() * 15)
  const dew = temp - Math.round(3 + Math.random() * 8)
  const qnh = Math.round(1010 + Math.random() * 20)
  const coverages = ['FEW', 'SCT', 'BKN', 'OVC']
  const clouds = []
  if (Math.random() > 0.3) {
    clouds.push({ coverage: coverages[Math.floor(Math.random() * 2)], altitude_ft: Math.round((15 + Math.random() * 30)) * 100 })
  }
  if (Math.random() > 0.5) {
    clouds.push({ coverage: coverages[2 + Math.floor(Math.random() * 2)], altitude_ft: Math.round((40 + Math.random() * 60)) * 100 })
  }
  const ceiling = clouds.find(c => c.coverage === 'BKN' || c.coverage === 'OVC')?.altitude_ft || null
  let category = 'VFR'
  if (vis < 1600 || (ceiling && ceiling < 500)) category = 'LIFR'
  else if (vis < 5000 || (ceiling && ceiling < 1000)) category = 'IFR'
  else if (vis < 8000 || (ceiling && ceiling < 3000)) category = 'MVFR'

  const windStr = `${String(dir).padStart(3,'0')}${String(spd).padStart(2,'0')}${gust ? `G${gust}` : ''}KT`
  const cloudStr = clouds.map(c => `${c.coverage}${String(c.altitude_ft/100).padStart(3,'0')}`).join(' ') || 'CAVOK'
  const raw = `${station} 271200Z ${windStr} ${vis === 9999 ? 'CAVOK' : vis} ${cloudStr} ${temp}/${dew} Q${qnh}`

  return {
    raw, station,
    time: new Date().toISOString(),
    wind: { direction: dir, speed_kt: spd, gust_kt: gust, variable: false },
    visibility_m: vis,
    weather: [],
    clouds,
    temperature_c: temp,
    dewpoint_c: dew,
    qnh_hpa: qnh,
    flight_category: category,
    ceiling_ft: ceiling,
  }
}

export function generateDemoWindsAloft(lat, lon) {
  const levels = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200]
  const altitudes = [363, 1060, 1772, 2498, 3241, 4779, 6391, 9878, 13793, 18289, 23574, 30065, 33999, 38662]
  return {
    latitude: lat, longitude: lon,
    winds: levels.map((p, i) => {
      const w = demoWind(altitudes[i])
      return { altitude_ft: altitudes[i], pressure_hpa: p, direction: w.direction, speed_kt: w.speed, temperature_c: w.temp }
    })
  }
}

export function generateDemoGoNoGo(metarDep, metarArr) {
  const items = []
  let overall = 'GO'
  for (const [label, metar] of [['Departure', metarDep], ['Arrival', metarArr]]) {
    if (!metar) continue
    if (metar.ceiling_ft != null) {
      const s = metar.ceiling_ft >= 1500 ? 'GO' : metar.ceiling_ft >= 1050 ? 'MARGINAL' : 'NOGO'
      items.push({ category: label, parameter: 'Ceiling', current_value: `${metar.ceiling_ft} ft`, limit_value: '1500 ft', status: s })
      if (s === 'NOGO') overall = 'NOGO'
      else if (s === 'MARGINAL' && overall !== 'NOGO') overall = 'MARGINAL'
    }
    if (metar.visibility_m != null) {
      const s = metar.visibility_m >= 5000 ? 'GO' : metar.visibility_m >= 3500 ? 'MARGINAL' : 'NOGO'
      items.push({ category: label, parameter: 'Visibility', current_value: `${metar.visibility_m} m`, limit_value: '5000 m', status: s })
      if (s === 'NOGO') overall = 'NOGO'
      else if (s === 'MARGINAL' && overall !== 'NOGO') overall = 'MARGINAL'
    }
    if (metar.wind) {
      const s = metar.wind.speed_kt <= 30 ? 'GO' : metar.wind.speed_kt <= 36 ? 'MARGINAL' : 'NOGO'
      items.push({ category: label, parameter: 'Wind', current_value: `${metar.wind.speed_kt} kt`, limit_value: '30 kt', status: s })
      if (s === 'NOGO') overall = 'NOGO'
      else if (s === 'MARGINAL' && overall !== 'NOGO') overall = 'MARGINAL'
    }
  }
  return { overall, items }
}

export function generateDemoDensityAlt(station) {
  const ap = DEMO_AIRPORTS[station]
  if (!ap) return null
  const temp = Math.round(15 + Math.random() * 15)
  const dew = temp - Math.round(3 + Math.random() * 8)
  const qnh = Math.round(1010 + Math.random() * 20)
  const pressAlt = Math.round(ap.elevation_ft + (1013.25 - qnh) * 30)
  const isa = 15 - (pressAlt / 1000) * 2
  const densAlt = Math.round(pressAlt + 120 * (temp - isa))
  return {
    station, elevation_ft: ap.elevation_ft,
    temperature_c: temp, dewpoint_c: dew, qnh_hpa: qnh,
    pressure_altitude_ft: pressAlt, density_altitude_ft: densAlt,
  }
}
