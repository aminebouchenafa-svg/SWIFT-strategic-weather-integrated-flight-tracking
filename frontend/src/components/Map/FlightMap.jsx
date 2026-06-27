import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import AIRPORTS from '../../data/airports'
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

function createAirportIcon(isLarge) {
  const size = isLarge ? 10 : 6
  const color = isLarge ? '#06b6d4' : '#f59e0b'
  return L.divIcon({
    className: 'airport-marker',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: 1.5px solid rgba(255,255,255,0.8);
      border-radius: 50%;
      box-shadow: 0 0 6px ${color}66;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const largeAirportIcon = createAirportIcon(true)
const smallAirportIcon = createAirportIcon(false)

const LARGE_AIRPORTS = new Set([
  'LFPG','LFPO','EGLL','EHAM','EDDF','LEMD','LEBL','LIRF','LSZH','EDDM',
  'LTFM','DAAG','GMMN','DTTA','HECA','OMDB','OTHH','OEJN','OERK','OLBA',
  'OJAI','LLBG','LFML','LFLL','LFMN','LFBO','LFBD','LSGG','LIMC','LIPZ',
  'EBBR','EDDB','EKCH','ENGM','ESSA','EFHK','EIDW','EPWA','LKPR','LHBP',
  'LROP','LOWW','LGAV','DAOO','DABC','GMMX','LPPT','EGCC',
])

function MapUpdater({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, bounds])
  return null
}

function AirportMarkers() {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  const visible = useMemo(() => {
    if (zoom >= 7) return AIRPORTS
    return AIRPORTS.filter(a => LARGE_AIRPORTS.has(a.icao))
  }, [zoom])

  return visible.map(ap => (
    <Marker
      key={ap.icao}
      position={[ap.lat, ap.lon]}
      icon={LARGE_AIRPORTS.has(ap.icao) ? largeAirportIcon : smallAirportIcon}
    >
      <Popup className="metar-popup">
        <div className="popup-content">
          <div className="popup-header">
            <strong>{ap.icao}</strong>
          </div>
          <div>{ap.name}</div>
          <div className="popup-elev">Elev: {ap.elev} ft</div>
        </div>
      </Popup>
    </Marker>
  ))
}

const OWM_KEY = '0cdd2fae7a2b0773eebb3149d0ed4d08'

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
        center={[36, 15]}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
              maxZoom={18}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Dark">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OSM'
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name="Nuages">
            <TileLayer
              url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.6}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Précipitations">
            <TileLayer
              url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.6}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Vent">
            <TileLayer
              url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.6}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Température">
            <TileLayer
              url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.6}
            />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Pression">
            <TileLayer
              url={`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.6}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <AirportMarkers />

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
          <Marker key={`st-${i}`} position={pos} icon={createStationIcon(metar.flight_category)}>
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
    </div>
  )
}
