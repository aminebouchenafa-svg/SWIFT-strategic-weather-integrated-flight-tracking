import { useEffect, useMemo, useState, useRef } from 'react'
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

function getWeatherIcon(code, isDay) {
  if (!isDay && code <= 2) return '🌙'
  return WMO_ICONS[code] || '☁️'
}

function createWeatherIcon(temp, weatherCode, isDay, name, isLarge) {
  const tempColor = temp <= 0 ? '#93c5fd' : temp <= 10 ? '#67e8f9' : temp <= 20 ? '#fde047' : temp <= 30 ? '#fb923c' : '#ef4444'
  const icon = getWeatherIcon(weatherCode, isDay)
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

// Manages radar + satellite tile layers natively via Leaflet for smooth animation
function AnimatedOverlay({ radarFrames, satelliteFrames, frameIndex, showRadar, showSatellite }) {
  const map = useMap()
  const radarLayersRef = useRef({})
  const satLayersRef = useRef({})
  const activeRadarRef = useRef(null)
  const activeSatRef = useRef(null)

  // Preload all tile layers
  useEffect(() => {
    radarFrames.forEach(f => {
      if (!radarLayersRef.current[f.path]) {
        const layer = L.tileLayer(
          `https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/6/1_1.png`,
          { opacity: 0, zIndex: 15, maxZoom: 18 }
        )
        radarLayersRef.current[f.path] = layer
        layer.addTo(map)
      }
    })
    return () => {
      Object.values(radarLayersRef.current).forEach(l => map.removeLayer(l))
      radarLayersRef.current = {}
    }
  }, [map, radarFrames])

  useEffect(() => {
    satelliteFrames.forEach(f => {
      if (!satLayersRef.current[f.path]) {
        const layer = L.tileLayer(
          `https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/0/0_0.png`,
          { opacity: 0, zIndex: 12, maxZoom: 18 }
        )
        satLayersRef.current[f.path] = layer
        layer.addTo(map)
      }
    })
    return () => {
      Object.values(satLayersRef.current).forEach(l => map.removeLayer(l))
      satLayersRef.current = {}
    }
  }, [map, satelliteFrames])

  // Switch visible frame
  useEffect(() => {
    // Hide previous
    if (activeRadarRef.current && radarLayersRef.current[activeRadarRef.current]) {
      radarLayersRef.current[activeRadarRef.current].setOpacity(0)
    }
    if (activeSatRef.current && satLayersRef.current[activeSatRef.current]) {
      satLayersRef.current[activeSatRef.current].setOpacity(0)
    }

    // Show current radar
    if (showRadar && radarFrames[frameIndex]) {
      const path = radarFrames[frameIndex].path
      if (radarLayersRef.current[path]) {
        radarLayersRef.current[path].setOpacity(0.7)
        activeRadarRef.current = path
      }
    } else {
      activeRadarRef.current = null
    }

    // Show current satellite (use same index clamped)
    if (showSatellite && satelliteFrames.length > 0) {
      const satIdx = Math.min(frameIndex, satelliteFrames.length - 1)
      const path = satelliteFrames[satIdx].path
      if (satLayersRef.current[path]) {
        satLayersRef.current[path].setOpacity(0.45)
        activeSatRef.current = path
      }
    } else {
      activeSatRef.current = null
    }
  }, [frameIndex, radarFrames, satelliteFrames, showRadar, showSatellite])

  return null
}

function WeatherMarkers({ hourlyData, hourIndex }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  const visible = useMemo(() => {
    if (zoom >= 7) return AIRPORTS
    if (zoom >= 5) return AIRPORTS.filter(a => LARGE_AIRPORTS.has(a.icao))
    return AIRPORTS.filter(a => LARGE_AIRPORTS.has(a.icao)).filter((_, i) => i % 3 === 0)
  }, [zoom])

  return visible.map(ap => {
    const data = hourlyData[ap.icao]
    if (!data) return null
    const temp = data.temps[hourIndex]
    const code = data.codes[hourIndex]
    const isDay = data.isDay[hourIndex]
    if (temp === undefined) return null
    const isLarge = LARGE_AIRPORTS.has(ap.icao) && zoom >= 4

    return (
      <Marker
        key={ap.icao}
        position={[ap.lat, ap.lon]}
        icon={createWeatherIcon(temp, code, isDay, ap.name, isLarge)}
      >
        <Popup className="metar-popup">
          <div className="popup-content">
            <div className="popup-header"><strong>{ap.icao}</strong></div>
            <div className="popup-name">{ap.name}</div>
            <div>🌡️ {temp}°C</div>
            <div>{getWeatherIcon(code, isDay)} Code: {code}</div>
            <div>📍 Elev: {ap.elev} ft</div>
          </div>
        </Popup>
      </Marker>
    )
  })
}

function formatTime(date) {
  const d = new Date(date)
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return `${days[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatTimeShort(date) {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}h`
}

export default function FlightMap() {
  const [radarFrames, setRadarFrames] = useState([])
  const [satelliteFrames, setSatelliteFrames] = useState([])
  const [hourlyData, setHourlyData] = useState({})
  const [hourlyTimes, setHourlyTimes] = useState([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('radar') // 'radar' or 'forecast'
  const [showClouds, setShowClouds] = useState(true)
  const [showRadar, setShowRadar] = useState(true)
  const playRef = useRef(null)

  const totalRadarFrames = radarFrames.length

  // Fetch RainViewer data (radar + satellite)
  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(data => {
        const past = data.radar?.past || []
        const nowcast = data.radar?.nowcast || []
        setRadarFrames([...past, ...nowcast])
        setSatelliteFrames(data.satellite?.infrared || [])
      })
      .catch(() => {})
  }, [])

  // Fetch hourly forecast
  useEffect(() => {
    const lats = AIRPORTS.map(a => a.lat).join(',')
    const lons = AIRPORTS.map(a => a.lon).join(',')
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=temperature_2m,weather_code,is_day,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m&forecast_days=3&timezone=auto`)
      .then(r => r.json())
      .then(data => {
        const results = {}
        let times = []
        if (Array.isArray(data)) {
          data.forEach((d, i) => {
            if (d.hourly) {
              if (!times.length) times = d.hourly.time
              results[AIRPORTS[i].icao] = {
                temps: d.hourly.temperature_2m,
                codes: d.hourly.weather_code,
                isDay: d.hourly.is_day.map(v => v === 1),
                clouds: d.hourly.cloud_cover,
                precip: d.hourly.precipitation,
                windSpeed: d.hourly.wind_speed_10m,
                windDir: d.hourly.wind_direction_10m,
              }
            }
          })
        }
        setHourlyData(results)
        setHourlyTimes(times)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Set initial frame to last radar frame (most recent)
  useEffect(() => {
    if (totalRadarFrames > 0 && mode === 'radar') {
      setFrameIndex(totalRadarFrames - 1)
    }
  }, [totalRadarFrames])

  const totalFrames = mode === 'radar' ? totalRadarFrames : hourlyTimes.length
  const speed = mode === 'radar' ? 600 : 800

  // Animation
  useEffect(() => {
    if (playing && totalFrames > 0) {
      playRef.current = setInterval(() => {
        setFrameIndex(prev => {
          const next = prev + 1
          if (next >= totalFrames) {
            if (mode === 'radar') {
              return 0 // loop radar
            }
            setPlaying(false)
            return prev
          }
          return next
        })
      }, speed)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [playing, totalFrames, mode, speed])

  const handlePlay = () => setPlaying(true)
  const handlePause = () => setPlaying(false)
  const handleStop = () => {
    setPlaying(false)
    if (mode === 'radar') {
      setFrameIndex(totalRadarFrames - 1)
    } else {
      const now = new Date()
      const nowStr = now.toISOString().slice(0, 13)
      let idx = hourlyTimes.findIndex(t => t.startsWith(nowStr))
      setFrameIndex(idx === -1 ? 0 : idx)
    }
  }

  const switchMode = (m) => {
    setPlaying(false)
    setMode(m)
    if (m === 'radar') {
      setFrameIndex(totalRadarFrames - 1)
    } else {
      const now = new Date()
      const nowStr = now.toISOString().slice(0, 13)
      let idx = hourlyTimes.findIndex(t => t.startsWith(nowStr))
      setFrameIndex(idx === -1 ? 0 : idx)
    }
  }

  // Current time label
  const currentTimeLabel = useMemo(() => {
    if (mode === 'radar' && radarFrames[frameIndex]) {
      return formatTime(new Date(radarFrames[frameIndex].time * 1000))
    }
    if (mode === 'forecast' && hourlyTimes[frameIndex]) {
      return formatTime(hourlyTimes[frameIndex])
    }
    return '--:--'
  }, [mode, frameIndex, radarFrames, hourlyTimes])

  // Forecast hour index for weather markers
  const forecastHourIndex = useMemo(() => {
    if (mode === 'forecast') return frameIndex
    // During radar mode, show current weather
    if (hourlyTimes.length > 0) {
      const now = new Date()
      const nowStr = now.toISOString().slice(0, 13)
      const idx = hourlyTimes.findIndex(t => t.startsWith(nowStr))
      return idx === -1 ? 0 : idx
    }
    return 0
  }, [mode, frameIndex, hourlyTimes])

  return (
    <div className="flight-map">
      <MapContainer center={[36, 10]} zoom={5} style={{ width: '100%', height: '100%' }} zoomControl={true}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          zIndex={20}
        />

        <AnimatedOverlay
          radarFrames={radarFrames}
          satelliteFrames={satelliteFrames}
          frameIndex={mode === 'radar' ? frameIndex : (satelliteFrames.length - 1)}
          showRadar={mode === 'radar' && showRadar}
          showSatellite={showClouds}
        />

        <WeatherMarkers hourlyData={hourlyData} hourIndex={forecastHourIndex} />
      </MapContainer>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button className={mode === 'radar' ? 'active' : ''} onClick={() => switchMode('radar')}>
          📡 Radar
        </button>
        <button className={mode === 'forecast' ? 'active' : ''} onClick={() => switchMode('forecast')}>
          📊 Prévisions 3J
        </button>
      </div>

      {/* Layer toggles */}
      <div className="layer-toggles">
        <button className={showClouds ? 'active' : ''} onClick={() => setShowClouds(v => !v)} title="Nuages satellite">
          ☁️
        </button>
        <button className={showRadar ? 'active' : ''} onClick={() => setShowRadar(v => !v)} title="Radar pluie/orages">
          🌧️
        </button>
      </div>

      {/* Timeline Player */}
      <div className="timeline-player">
        <div className="timeline-top">
          <div className="timeline-badge">
            {mode === 'radar' ? '📡 RADAR LIVE' : (() => {
              const h = frameIndex
              if (h <= 1) return '🕐 MAINTENANT'
              if (h < 24) return `📊 +${h}H`
              return `📊 J+${Math.floor(h / 24)}`
            })()}
          </div>
          <div className="timeline-time">{currentTimeLabel}</div>
        </div>

        <div className="timeline-slider-row">
          <input
            type="range"
            className="timeline-slider"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={frameIndex}
            onChange={e => { setFrameIndex(Number(e.target.value)); setPlaying(false) }}
          />
        </div>

        <div className="timeline-ticks">
          {mode === 'radar' && radarFrames.map((f, i) => {
            if (i % 3 !== 0) return null
            const pos = (i / (totalRadarFrames - 1)) * 100
            const d = new Date(f.time * 1000)
            return <div key={i} className="tick" style={{ left: `${pos}%` }}>
              <span>{String(d.getHours()).padStart(2,'0')}:{String(d.getMinutes()).padStart(2,'0')}</span>
            </div>
          })}
          {mode === 'forecast' && hourlyTimes.map((t, i) => {
            if (i % 6 !== 0) return null
            const pos = (i / (hourlyTimes.length - 1)) * 100
            return <div key={i} className="tick" style={{ left: `${pos}%` }}>
              <span>{formatTimeShort(t)}</span>
            </div>
          })}
        </div>

        <div className="timeline-controls">
          <button className="ctrl-btn" onClick={handleStop} title="Stop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
          </button>
          <button className="ctrl-btn" onClick={() => { setFrameIndex(i => Math.max(0, i - 1)); setPlaying(false) }} title="Reculer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          {playing ? (
            <button className="ctrl-btn ctrl-main" onClick={handlePause} title="Pause">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            </button>
          ) : (
            <button className="ctrl-btn ctrl-main" onClick={handlePlay} title="Play">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
            </button>
          )}
          <button className="ctrl-btn" onClick={() => { setFrameIndex(i => Math.min(totalFrames - 1, i + 1)); setPlaying(false) }} title="Avancer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span>Chargement météo...</span>
        </div>
      )}
    </div>
  )
}
