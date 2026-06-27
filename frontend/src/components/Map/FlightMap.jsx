import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import AIRPORTS from '../../data/airports'
import './FlightMap.css'

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

function getWeatherIcon(code, isNight) {
  if (isNight && code <= 2) return '🌙'
  return WMO_ICONS[code] || '☁️'
}

function createWeatherIcon(temp, weatherCode, isNight, name, isLarge) {
  const tempColor = temp <= 0 ? '#93c5fd' : temp <= 10 ? '#67e8f9' : temp <= 20 ? '#fde047' : temp <= 30 ? '#fb923c' : '#ef4444'
  const icon = getWeatherIcon(weatherCode, isNight)

  return L.divIcon({
    className: 'weather-marker',
    html: `<div class="weather-label ${isLarge ? 'large' : 'small'}">
      <span class="weather-icon">${icon}</span>
      <span class="weather-temp" style="color:${tempColor}">${Math.round(temp)}°</span>
      ${isLarge ? `<span class="weather-name">${name}</span>` : ''}
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

const LARGE_AIRPORTS = new Set([
  'LFPG','EGLL','EHAM','EDDF','LEMD','LEBL','LIRF','LTFM',
  'DAAG','GMMN','GMMX','DTTA','HECA','OMDB','OTHH','OEJN','OERK',
  'OLBA','OJAI','LLBG','LFML','LFLL','LFMN','LFBO','LFBD',
  'LSGG','LIMC','EBBR','EDDB','EKCH','ENGM','ESSA',
  'EFHK','EIDW','EPWA','LKPR','LHBP','LOWW','LGAV',
  'DAOO','DABC','LPPT','EGCC','EDDM','LSZH','LPPR',
  'LFPO','LIRN','LEMG','LEAL','LGIR','LTAI','HEGN','HESH',
  'OMAD','OKBK','OBBI','OOMS','ORBI','OIIE','LCLK',
  'GMFF','GMTT','GMAD','DAAS','DAFH','DAAT',
])

function RainViewerLayer() {
  const [tileUrl, setTileUrl] = useState(null)

  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(data => {
        const latest = data.radar?.past?.slice(-1)[0]
        if (latest) {
          setTileUrl(`https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/4/1_1.png`)
        }
      })
      .catch(() => {})
  }, [])

  if (!tileUrl) return null
  return <TileLayer url={tileUrl} opacity={0.4} zIndex={10} />
}

function WeatherMarkers() {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  const [weatherData, setWeatherData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  useEffect(() => {
    const lats = AIRPORTS.map(a => a.lat).join(',')
    const lons = AIRPORTS.map(a => a.lon).join(',')
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,is_day&timezone=auto`)
      .then(r => r.json())
      .then(data => {
        const results = {}
        if (Array.isArray(data)) {
          data.forEach((d, i) => {
            if (d.current) {
              results[AIRPORTS[i].icao] = {
                temp: d.current.temperature_2m,
                code: d.current.weather_code,
                isNight: !d.current.is_day,
              }
            }
          })
        }
        setWeatherData(results)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    if (zoom >= 7) return AIRPORTS
    if (zoom >= 5) return AIRPORTS.filter(a => LARGE_AIRPORTS.has(a.icao))
    return AIRPORTS.filter(a => LARGE_AIRPORTS.has(a.icao)).filter((_, i) => i % 3 === 0)
  }, [zoom])

  return visible.map(ap => {
    const w = weatherData[ap.icao]
    if (!w) return null
    const isLarge = LARGE_AIRPORTS.has(ap.icao) && zoom >= 4

    return (
      <Marker
        key={ap.icao}
        position={[ap.lat, ap.lon]}
        icon={createWeatherIcon(w.temp, w.code, w.isNight, ap.name, isLarge)}
      >
        <Popup className="metar-popup">
          <div className="popup-content">
            <div className="popup-header">
              <strong>{ap.icao}</strong>
            </div>
            <div className="popup-name">{ap.name}</div>
            <div>🌡️ {w.temp}°C</div>
            <div>{getWeatherIcon(w.code, w.isNight)} Code: {w.code}</div>
            <div>📍 Elev: {ap.elev} ft</div>
          </div>
        </Popup>
      </Marker>
    )
  })
}

export default function FlightMap() {
  return (
    <div className="flight-map">
      <MapContainer
        center={[36, 10]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
          maxZoom={18}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          zIndex={5}
        />

        <RainViewerLayer />
        <WeatherMarkers />
      </MapContainer>
    </div>
  )
}
