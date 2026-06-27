import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import './FlightMap.css'

const CATEGORY_COLORS = {
  VFR: '#10b981',
  MVFR: '#3b82f6',
  IFR: '#ef4444',
  LIFR: '#a855f7',
  UNKNOWN: '#6b7280',
}

function createStationIcon(category) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.UNKNOWN
  return L.divIcon({
    className: 'station-marker',
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 8px ${color}88;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function MapUpdater({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, bounds])
  return null
}

export default function FlightMap({ flightPlan, metarDep, metarArr }) {
  const routePositions = useMemo(() => {
    if (!flightPlan?.waypoints) return []
    return flightPlan.waypoints.map(wp => [wp.latitude, wp.longitude])
  }, [flightPlan])

  const bounds = useMemo(() => {
    if (routePositions.length < 2) return null
    return L.latLngBounds(routePositions)
  }, [routePositions])

  const stations = useMemo(() => {
    const s = []
    if (metarDep && flightPlan?.waypoints?.[0]) {
      s.push({ metar: metarDep, pos: [flightPlan.waypoints[0].latitude, flightPlan.waypoints[0].longitude] })
    }
    if (metarArr && flightPlan?.waypoints) {
      const last = flightPlan.waypoints[flightPlan.waypoints.length - 1]
      s.push({ metar: metarArr, pos: [last.latitude, last.longitude] })
    }
    return s
  }, [metarDep, metarArr, flightPlan])

  return (
    <div className="flight-map">
      <MapContainer
        center={[46.6, 2.5]}
        zoom={6}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {routePositions.length >= 2 && (
          <>
            <Polyline
              positions={routePositions}
              pathOptions={{ color: '#06b6d4', weight: 3, opacity: 0.8, dashArray: '10 6' }}
            />
            <Polyline
              positions={routePositions}
              pathOptions={{ color: '#06b6d4', weight: 1, opacity: 0.3 }}
            />
          </>
        )}

        {stations.map(({ metar, pos }, i) => (
          <Marker key={i} position={pos} icon={createStationIcon(metar.flight_category)}>
            <Popup className="metar-popup">
              <div className="popup-content">
                <div className="popup-header">
                  <strong>{metar.station}</strong>
                  <span className={`cat-badge cat-${metar.flight_category.toLowerCase()}`}>
                    {metar.flight_category}
                  </span>
                </div>
                {metar.wind && (
                  <div>Vent: {metar.wind.direction || 'VRB'}° / {metar.wind.speed_kt} kt
                    {metar.wind.gust_kt ? ` G${metar.wind.gust_kt}` : ''}
                  </div>
                )}
                {metar.visibility_m != null && <div>Visibilité: {metar.visibility_m} m</div>}
                {metar.clouds.length > 0 && (
                  <div>Nuages: {metar.clouds.map(c => `${c.coverage} ${c.altitude_ft}ft`).join(', ')}</div>
                )}
                {metar.temperature_c != null && <div>Temp: {metar.temperature_c}°C / Td: {metar.dewpoint_c}°C</div>}
                {metar.qnh_hpa && <div>QNH: {metar.qnh_hpa} hPa</div>}
                <div className="popup-raw">{metar.raw}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {flightPlan?.waypoints?.map((wp, i) => {
          if (i === 0 || i === flightPlan.waypoints.length - 1) return null
          return (
            <Circle
              key={i}
              center={[wp.latitude, wp.longitude]}
              radius={3000}
              pathOptions={{ color: '#f59e0b', weight: 1, fillOpacity: 0.3 }}
            />
          )
        })}

        <MapUpdater bounds={bounds} />
      </MapContainer>

      {!flightPlan && (
        <div className="map-overlay">
          <p>Entrez un plan de vol pour afficher la route</p>
        </div>
      )}
    </div>
  )
}
