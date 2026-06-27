import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
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

function RadarLayer({ radarFrames, currentFrameIndex }) {
  const frame = radarFrames[currentFrameIndex]
  if (!frame) return null
  return (
    <TileLayer
      key={frame.path}
      url={`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/4/1_1.png`}
      opacity={0.5}
      zIndex={10}
    />
  )
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
    if (!data || !data.temps[hourIndex] !== undefined) {
      if (!data) return null
    }
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
            <div className="popup-header">
              <strong>{ap.icao}</strong>
            </div>
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
  const day = days[d.getDay()]
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${h}:${m}`
}

function formatTimeShort(date) {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function FlightMap() {
  const [radarFrames, setRadarFrames] = useState([])
  const [hourlyData, setHourlyData] = useState({})
  const [hourlyTimes, setHourlyTimes] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [radarCount, setRadarCount] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const playRef = useRef(null)

  // Fetch radar frames from RainViewer
  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(data => {
        const past = data.radar?.past || []
        const nowcast = data.radar?.nowcast || []
        const allFrames = [...past, ...nowcast]
        setRadarFrames(allFrames)
        setRadarCount(allFrames.length)
      })
      .catch(() => {})
  }, [])

  // Fetch 3-day hourly forecast from Open-Meteo
  useEffect(() => {
    const lats = AIRPORTS.map(a => a.lat).join(',')
    const lons = AIRPORTS.map(a => a.lon).join(',')
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=temperature_2m,weather_code,is_day,cloud_cover&forecast_days=3&timezone=auto`)
      .then(r => r.json())
      .then(data => {
        const results = {}
        let times = []
        if (Array.isArray(data)) {
          data.forEach((d, i) => {
            if (d.hourly) {
              if (times.length === 0) times = d.hourly.time
              results[AIRPORTS[i].icao] = {
                temps: d.hourly.temperature_2m,
                codes: d.hourly.weather_code,
                isDay: d.hourly.is_day.map(v => v === 1),
                clouds: d.hourly.cloud_cover,
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

  // Compute total frames and initial position
  useEffect(() => {
    const total = radarCount + hourlyTimes.length
    setTotalFrames(total)
    // Start at current hour in the hourly data
    if (hourlyTimes.length > 0) {
      const now = new Date()
      const nowStr = now.toISOString().slice(0, 13)
      let idx = hourlyTimes.findIndex(t => t.startsWith(nowStr))
      if (idx === -1) idx = 0
      setCurrentIndex(radarCount + idx)
    }
  }, [radarCount, hourlyTimes])

  // Play/pause animation
  useEffect(() => {
    if (playing && totalFrames > 0) {
      playRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const next = prev + 1
          if (next >= totalFrames) {
            setPlaying(false)
            return prev
          }
          return next
        })
      }, 500)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [playing, totalFrames])

  const handlePlay = () => setPlaying(true)
  const handlePause = () => setPlaying(false)
  const handleStop = () => {
    setPlaying(false)
    // Reset to current time
    if (hourlyTimes.length > 0) {
      const now = new Date()
      const nowStr = now.toISOString().slice(0, 13)
      let idx = hourlyTimes.findIndex(t => t.startsWith(nowStr))
      if (idx === -1) idx = 0
      setCurrentIndex(radarCount + idx)
    } else {
      setCurrentIndex(0)
    }
  }

  const isRadarPhase = currentIndex < radarCount
  const hourIndex = isRadarPhase ? 0 : currentIndex - radarCount
  const currentHourIndex = Math.min(hourIndex, hourlyTimes.length - 1)

  const currentTimeLabel = useMemo(() => {
    if (isRadarPhase && radarFrames[currentIndex]) {
      return formatTime(new Date(radarFrames[currentIndex].time * 1000))
    }
    if (hourlyTimes[currentHourIndex]) {
      return formatTime(hourlyTimes[currentHourIndex])
    }
    return '--:--'
  }, [isRadarPhase, currentIndex, radarFrames, hourlyTimes, currentHourIndex])

  const timelineLabel = useMemo(() => {
    if (isRadarPhase) return '📡 RADAR LIVE'
    const h = currentHourIndex
    if (h <= 1) return '🕐 MAINTENANT'
    if (h <= 24) return '📊 PRÉVISIONS +' + h + 'h'
    const days = Math.floor(h / 24)
    return '📊 PRÉVISIONS J+' + days
  }, [isRadarPhase, currentHourIndex])

  const progress = totalFrames > 0 ? (currentIndex / (totalFrames - 1)) * 100 : 0

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

        {isRadarPhase && (
          <RadarLayer radarFrames={radarFrames} currentFrameIndex={currentIndex} />
        )}

        <WeatherMarkers hourlyData={hourlyData} hourIndex={currentHourIndex} />
      </MapContainer>

      {/* Timeline Player */}
      <div className="timeline-player">
        <div className="timeline-top">
          <div className="timeline-badge">{timelineLabel}</div>
          <div className="timeline-time">{currentTimeLabel}</div>
        </div>

        <div className="timeline-slider-row">
          <input
            type="range"
            className="timeline-slider"
            min={0}
            max={totalFrames - 1}
            value={currentIndex}
            onChange={e => {
              setCurrentIndex(Number(e.target.value))
              setPlaying(false)
            }}
          />
        </div>

        <div className="timeline-ticks">
          {hourlyTimes.length > 0 && (() => {
            const ticks = []
            for (let i = 0; i < hourlyTimes.length; i += 6) {
              const pos = ((radarCount + i) / (totalFrames - 1)) * 100
              ticks.push(
                <div key={i} className="tick" style={{ left: `${pos}%` }}>
                  <span>{formatTimeShort(hourlyTimes[i])}</span>
                </div>
              )
            }
            return ticks
          })()}
        </div>

        <div className="timeline-controls">
          <button className="ctrl-btn" onClick={handleStop} title="Stop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
          </button>
          {playing ? (
            <button className="ctrl-btn ctrl-main" onClick={handlePause} title="Pause">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            </button>
          ) : (
            <button className="ctrl-btn ctrl-main" onClick={handlePlay} title="Play">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
            </button>
          )}
          <button className="ctrl-btn" onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setPlaying(false) }} title="-1h">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <button className="ctrl-btn" onClick={() => { setCurrentIndex(i => Math.min(totalFrames - 1, i + 1)); setPlaying(false) }} title="+1h">
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
