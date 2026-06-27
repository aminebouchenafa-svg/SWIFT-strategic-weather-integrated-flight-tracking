import { Cloud, Eye, Wind, Droplets, Gauge } from 'lucide-react'
import './WeatherPanel.css'

function MetarCard({ metar, label }) {
  if (!metar || !metar.raw) return null

  const catClass = `cat-${(metar.flight_category || 'unknown').toLowerCase()}`

  return (
    <div className="metar-card">
      <div className="metar-header">
        <span className="metar-station">{metar.station}</span>
        <span className="metar-label">{label}</span>
        <span className={`metar-cat ${catClass}`}>{metar.flight_category}</span>
      </div>
      <div className="metar-raw">{metar.raw}</div>
      <div className="metar-details">
        {metar.wind && (
          <div className="metar-detail">
            <Wind size={12} />
            <span>{metar.wind.variable ? 'VRB' : `${metar.wind.direction}°`} / {metar.wind.speed_kt} kt
              {metar.wind.gust_kt ? ` G${metar.wind.gust_kt}` : ''}</span>
          </div>
        )}
        {metar.visibility_m != null && (
          <div className="metar-detail">
            <Eye size={12} />
            <span>{metar.visibility_m >= 9999 ? '10+ km' : `${metar.visibility_m} m`}</span>
          </div>
        )}
        {metar.clouds.length > 0 && (
          <div className="metar-detail">
            <Cloud size={12} />
            <span>{metar.clouds.map(c =>
              `${c.coverage} ${c.altitude_ft}ft${c.cloud_type ? ` ${c.cloud_type}` : ''}`
            ).join(' / ')}</span>
          </div>
        )}
        {metar.temperature_c != null && (
          <div className="metar-detail">
            <Droplets size={12} />
            <span>{metar.temperature_c}°C / {metar.dewpoint_c}°C</span>
          </div>
        )}
        {metar.qnh_hpa && (
          <div className="metar-detail">
            <Gauge size={12} />
            <span>QNH {metar.qnh_hpa} hPa</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WeatherPanel({ metarDep, metarArr, tafDep, densityAlt }) {
  if (!metarDep && !metarArr) {
    return (
      <div className="weather-panel-empty">
        <Cloud size={24} />
        <span>Données météo disponibles après calcul du plan de vol</span>
      </div>
    )
  }

  return (
    <div className="weather-panel">
      <MetarCard metar={metarDep} label="Départ" />
      <MetarCard metar={metarArr} label="Arrivée" />
      {tafDep && tafDep.raw && (
        <div className="taf-card">
          <div className="taf-header">TAF {tafDep.station}</div>
          <div className="taf-raw">{tafDep.raw}</div>
          {tafDep.forecasts?.length > 0 && (
            <div className="taf-forecasts">
              {tafDep.forecasts.map((fc, i) => (
                <div key={i} className="taf-forecast">
                  <span className="taf-type">{fc.type}{fc.probability ? ` ${fc.probability}%` : ''}</span>
                  {fc.wind && <span>{fc.wind.direction || 'VRB'}°/{fc.wind.speed_kt}kt</span>}
                  {fc.visibility_m != null && <span>{fc.visibility_m}m</span>}
                  {fc.clouds.map((c, j) => (
                    <span key={j}>{c.coverage} {c.altitude_ft}ft</span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
