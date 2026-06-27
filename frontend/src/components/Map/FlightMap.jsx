import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import AIRPORTS from '../../data/airports'
import './FlightMap.css'

const CAT_COLORS = {
  vfr: '#22c55e',
  mvfr: '#3b82f6',
  ifr: '#ef4444',
  lifr: '#a855f7',
  lvo: '#a855f7',
}

const CAT_LABELS = {
  vfr: 'VFR',
  mvfr: 'MVFR',
  ifr: 'IFR',
  lifr: 'LVO',
  lvo: 'LVO',
}

function getFlightCatFromVis(visibility) {
  if (visibility === undefined || visibility === null) return 'vfr'
  if (visibility >= 9000) return 'vfr'
  if (visibility >= 5000) return 'mvfr'
  if (visibility >= 1600) return 'ifr'
  return 'lvo'
}

const MAJOR = new Set([
  'LFPG','EGLL','EHAM','EDDF','LEMD','LEBL','LIRF','LTFM',
  'DAAG','GMMN','DTTA','HECA','OMDB','OTHH','OEJN',
  'LFML','LFBO','LFBD','EBBR','EDDM','EKCH','LGAV',
  'DAOO','LPPT','LSZH','LOWW','EPWA','LHBP',
  'OERK','OLBA','OJAI','LLBG','DAAT','DAFH',
])

function RadarOverlay({ frames, frameIdx }) {
  const map = useMap()
  const layersRef = useRef({})
  const activeRef = useRef(null)

  useEffect(() => {
    const layers = layersRef.current
    frames.forEach(f => {
      if (!layers[f.path]) {
        layers[f.path] = L.tileLayer(
          `https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/6/1_1.png`,
          { opacity: 0, zIndex: 300 }
        )
        layers[f.path].addTo(map)
      }
    })
    return () => {
      Object.values(layers).forEach(l => map.removeLayer(l))
      layersRef.current = {}
    }
  }, [map, frames])

  useEffect(() => {
    const layers = layersRef.current
    if (activeRef.current && layers[activeRef.current]) {
      layers[activeRef.current].setOpacity(0)
    }
    const f = frames[frameIdx]
    if (f && layers[f.path]) {
      layers[f.path].setOpacity(0.75)
      activeRef.current = f.path
    }
  }, [frameIdx, frames])

  return null
}

function SatelliteOverlay({ frames, frameIdx }) {
  const map = useMap()
  const layersRef = useRef({})
  const activeRef = useRef(null)

  useEffect(() => {
    const layers = layersRef.current
    frames.forEach(f => {
      if (!layers[f.path]) {
        layers[f.path] = L.tileLayer(
          `https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/0/1_0.png`,
          { opacity: 0, zIndex: 250 }
        )
        layers[f.path].addTo(map)
      }
    })
    return () => {
      Object.values(layers).forEach(l => map.removeLayer(l))
      layersRef.current = {}
    }
  }, [map, frames])

  useEffect(() => {
    const layers = layersRef.current
    if (activeRef.current && layers[activeRef.current]) {
      layers[activeRef.current].setOpacity(0)
    }
    const idx = Math.min(frameIdx, frames.length - 1)
    const f = frames[idx]
    if (f && layers[f.path]) {
      layers[f.path].setOpacity(0.9)
      activeRef.current = f.path
    }
  }, [frameIdx, frames])

  return null
}

function AirportMarkers({ metarData, forecastData, hourIndex, mode, onSelect }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  const visible = useMemo(() => {
    if (zoom >= 7) return AIRPORTS
    if (zoom >= 5) return AIRPORTS.filter(a => MAJOR.has(a.icao))
    return AIRPORTS.filter(a => MAJOR.has(a.icao)).filter((_, i) => i % 2 === 0)
  }, [zoom])

  const radius = zoom >= 8 ? 7 : zoom >= 6 ? 6 : 5

  return visible.map(ap => {
    const metar = metarData[ap.icao]
    const fc = forecastData[ap.icao]

    let cat
    if (mode === 'radar' && metar) {
      cat = (metar.fltCat || 'vfr').toLowerCase()
      if (cat === 'lifr') cat = 'lvo'
    } else if (fc) {
      const vis = fc.visibility?.[hourIndex]
      cat = getFlightCatFromVis(vis)
    } else {
      return null
    }

    const color = CAT_COLORS[cat] || CAT_COLORS.vfr

    return (
      <CircleMarker
        key={ap.icao}
        center={[ap.lat, ap.lon]}
        radius={radius}
        pathOptions={{
          fillColor: color,
          fillOpacity: 0.9,
          color: '#fff',
          weight: 1.5,
          opacity: 0.8,
        }}
        eventHandlers={{ click: () => onSelect(ap) }}
      />
    )
  })
}

function AirportPanel({ airport, metarData, onClose }) {
  const [taf, setTaf] = useState(null)
  const [loadingTaf, setLoadingTaf] = useState(true)

  const metar = metarData[airport.icao]
  const cat = metar ? (metar.fltCat || 'VFR').toUpperCase() : null
  const catClass = cat ? cat.toLowerCase() : 'vfr'

  useEffect(() => {
    setLoadingTaf(true)
    setTaf(null)
    fetch(`https://aviationweather.gov/api/data/taf?ids=${airport.icao}&format=json`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTaf(data[0])
        }
        setLoadingTaf(false)
      })
      .catch(() => setLoadingTaf(false))
  }, [airport.icao])

  const fmtAge = (obsTime) => {
    if (!obsTime) return ''
    const mins = Math.round((Date.now() / 1000 - obsTime) / 60)
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h${mins % 60 ? String(mins % 60).padStart(2, '0') : ''}`
  }

  return (
    <div className="airport-panel">
      <div className="panel-header">
        <div className="panel-title">
          <strong>{airport.icao}</strong>
          {cat && <span className={`cat-badge cat-${catClass === 'lifr' ? 'lvo' : catClass}`}>{cat === 'LIFR' ? 'LVO' : cat}</span>}
        </div>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="panel-airport-name">{airport.name}</div>
      <div className="panel-airport-info">
        📍 {airport.elev} ft &nbsp;|&nbsp; {airport.lat.toFixed(3)}° {airport.lon.toFixed(3)}°
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">METAR</span>
          {metar && <span className="panel-age">{fmtAge(metar.obsTime)}</span>}
        </div>
        {metar ? (
          <>
            <div className="panel-raw">{metar.rawOb}</div>
            <div className="panel-decoded">
              <div className="decoded-row">
                <span className="decoded-label">Vent</span>
                <span>{metar.wdir === 'VRB' ? 'Variable' : `${metar.wdir}°`} / {metar.wspd} kt{metar.wgst ? ` G${metar.wgst}` : ''}</span>
              </div>
              <div className="decoded-row">
                <span className="decoded-label">Visibilité</span>
                <span>{metar.visib === '6+' ? '> 10 km (CAVOK)' : `${(metar.visib * 1.60934).toFixed(1)} km`}</span>
              </div>
              <div className="decoded-row">
                <span className="decoded-label">Température</span>
                <span>{metar.temp}°C / Td {metar.dewp}°C</span>
              </div>
              <div className="decoded-row">
                <span className="decoded-label">QNH</span>
                <span>{metar.altim} hPa</span>
              </div>
              {metar.clouds && metar.clouds.length > 0 && (
                <div className="decoded-row">
                  <span className="decoded-label">Nuages</span>
                  <span>{metar.clouds.map(c => `${c.cover} ${c.base}ft`).join(', ')}</span>
                </div>
              )}
              {metar.wxString && (
                <div className="decoded-row">
                  <span className="decoded-label">Phénomènes</span>
                  <span>{metar.wxString}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="panel-no-data">Pas de METAR disponible</div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">TAF</span>
        </div>
        {loadingTaf ? (
          <div className="panel-loading">Chargement TAF...</div>
        ) : taf ? (
          <div className="panel-raw">{taf.rawTAF}</div>
        ) : (
          <div className="panel-no-data">Pas de TAF disponible</div>
        )}
      </div>
    </div>
  )
}

function fmtTime(d) {
  const dt = new Date(d)
  const jours = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
  return `${jours[dt.getDay()]} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}

async function fetchMetars() {
  const batchSize = 60
  const results = {}
  for (let i = 0; i < AIRPORTS.length; i += batchSize) {
    const batch = AIRPORTS.slice(i, i + batchSize)
    const ids = batch.map(a => a.icao).join(',')
    try {
      const r = await fetch(`https://aviationweather.gov/api/data/metar?ids=${ids}&format=json`)
      const data = await r.json()
      if (Array.isArray(data)) {
        data.forEach(m => {
          results[m.icaoId] = m
        })
      }
    } catch {}
  }
  return results
}

export default function FlightMap() {
  const [radarFrames, setRadarFrames] = useState([])
  const [satFrames, setSatFrames] = useState([])
  const [metarData, setMetarData] = useState({})
  const [forecastData, setForecastData] = useState({})
  const [hourlyTimes, setHourlyTimes] = useState([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('radar')
  const [selectedAirport, setSelectedAirport] = useState(null)
  const playRef = useRef(null)

  const totalRadar = radarFrames.length
  const totalForecast = hourlyTimes.length
  const total = mode === 'radar' ? totalRadar : totalForecast

  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(data => {
        setRadarFrames([...(data.radar?.past || []), ...(data.radar?.nowcast || [])])
        setSatFrames(data.satellite?.infrared || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchMetars().then(data => {
      setMetarData(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const lats = AIRPORTS.map(a => a.lat).join(',')
    const lons = AIRPORTS.map(a => a.lon).join(',')
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=temperature_2m,weather_code,is_day,visibility&forecast_days=3&timezone=auto`)
      .then(r => r.json())
      .then(data => {
        const res = {}; let t = []
        if (Array.isArray(data)) {
          data.forEach((d, i) => {
            if (d.hourly) {
              if (!t.length) t = d.hourly.time
              res[AIRPORTS[i].icao] = {
                temps: d.hourly.temperature_2m,
                codes: d.hourly.weather_code,
                isDay: d.hourly.is_day.map(v => v === 1),
                visibility: d.hourly.visibility,
              }
            }
          })
        }
        setForecastData(res); setHourlyTimes(t)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mode === 'radar' && totalRadar > 0) setFrameIdx(totalRadar - 1)
  }, [totalRadar, mode])

  useEffect(() => {
    if (mode === 'forecast' && hourlyTimes.length) {
      const now = new Date().toISOString().slice(0, 13)
      const idx = hourlyTimes.findIndex(t => t.startsWith(now))
      setFrameIdx(idx === -1 ? 0 : idx)
    }
  }, [hourlyTimes, mode])

  useEffect(() => {
    if (!playing || total <= 0) return
    const speed = mode === 'radar' ? 500 : 700
    playRef.current = setInterval(() => {
      setFrameIdx(p => {
        if (p + 1 >= total) {
          if (mode === 'radar') return 0
          setPlaying(false); return p
        }
        return p + 1
      })
    }, speed)
    return () => clearInterval(playRef.current)
  }, [playing, total, mode])

  const switchMode = m => {
    setPlaying(false); setMode(m)
  }

  const forecastHour = useMemo(() => {
    if (mode === 'forecast') return frameIdx
    if (!hourlyTimes.length) return 0
    const now = new Date().toISOString().slice(0, 13)
    const idx = hourlyTimes.findIndex(t => t.startsWith(now))
    return idx === -1 ? 0 : idx
  }, [mode, frameIdx, hourlyTimes])

  const timeLabel = useMemo(() => {
    if (mode === 'radar' && radarFrames[frameIdx])
      return fmtTime(new Date(radarFrames[frameIdx].time * 1000))
    if (mode === 'forecast' && hourlyTimes[frameIdx])
      return fmtTime(hourlyTimes[frameIdx])
    return '--:--'
  }, [mode, frameIdx, radarFrames, hourlyTimes])

  const badge = mode === 'radar' ? '📡 RADAR LIVE'
    : forecastHour <= 1 ? '🕐 MAINTENANT'
    : forecastHour < 24 ? `📊 PRÉVISIONS +${forecastHour}H`
    : `📊 J+${Math.floor(forecastHour / 24)}`

  const handleSelect = useCallback((ap) => {
    setSelectedAirport(ap)
  }, [])

  return (
    <div className="flight-map">
      <MapContainer center={[36, 10]} zoom={5} style={{width:'100%',height:'100%'}} zoomControl={true}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
          attribution="Esri"
        />

        {mode === 'radar' && satFrames.length > 0 && (
          <SatelliteOverlay frames={satFrames} frameIdx={frameIdx < satFrames.length ? frameIdx : satFrames.length - 1} />
        )}
        {mode === 'radar' && radarFrames.length > 0 && (
          <RadarOverlay frames={radarFrames} frameIdx={frameIdx} />
        )}

        <AirportMarkers
          metarData={metarData}
          forecastData={forecastData}
          hourIndex={forecastHour}
          mode={mode}
          onSelect={handleSelect}
        />
      </MapContainer>

      <div className="legend">
        <span className="legend-dot" style={{background:'#22c55e'}}></span> VFR
        <span className="legend-dot" style={{background:'#3b82f6'}}></span> MVFR
        <span className="legend-dot" style={{background:'#ef4444'}}></span> IFR
        <span className="legend-dot" style={{background:'#a855f7'}}></span> LVO
      </div>

      <div className="mode-tabs">
        <button className={mode === 'radar' ? 'on' : ''} onClick={() => switchMode('radar')}>📡 Radar</button>
        <button className={mode === 'forecast' ? 'on' : ''} onClick={() => switchMode('forecast')}>📊 3 Jours</button>
      </div>

      <div className="player">
        <div className="player-top">
          <span className="badge">{badge}</span>
          <span className="time">{timeLabel}</span>
        </div>
        <input type="range" className="slider" min={0} max={Math.max(0, total - 1)}
          value={frameIdx} onChange={e => { setFrameIdx(+e.target.value); setPlaying(false) }} />
        <div className="controls">
          <button className="cb" onClick={() => { setPlaying(false); setFrameIdx(mode === 'radar' ? totalRadar - 1 : 0) }}>⏹</button>
          <button className="cb" onClick={() => { setFrameIdx(i => Math.max(0, i - 1)); setPlaying(false) }}>⏮</button>
          <button className="cb main" onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶️'}</button>
          <button className="cb" onClick={() => { setFrameIdx(i => Math.min(total - 1, i + 1)); setPlaying(false) }}>⏭</button>
        </div>
      </div>

      {selectedAirport && (
        <AirportPanel
          airport={selectedAirport}
          metarData={metarData}
          onClose={() => setSelectedAirport(null)}
        />
      )}

      {loading && <div className="loader"><div className="spin" /><span>Chargement METARs...</span></div>}
    </div>
  )
}
