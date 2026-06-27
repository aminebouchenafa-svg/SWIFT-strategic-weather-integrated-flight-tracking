import { Wind, ArrowUp, ArrowDown } from 'lucide-react'
import './WindsPanel.css'

export default function WindsPanel({ windsAloft, flightPlan }) {
  if (!windsAloft || !windsAloft.winds?.length) {
    return (
      <div className="winds-empty">
        <Wind size={32} />
        <p>Vents en altitude disponibles après calcul du plan de vol</p>
      </div>
    )
  }

  const cruiseAlt = flightPlan?.cruise_altitude_ft || 5000

  return (
    <div className="winds-panel">
      <h3 className="winds-title">
        <Wind size={16} />
        Vents en Altitude
      </h3>
      <div className="winds-location">
        {windsAloft.latitude.toFixed(2)}°N / {windsAloft.longitude.toFixed(2)}°E
      </div>

      <div className="winds-table">
        <div className="winds-header-row">
          <span>Altitude</span>
          <span>Pression</span>
          <span>Direction</span>
          <span>Vitesse</span>
          <span>Température</span>
        </div>
        {windsAloft.winds.map((w, i) => {
          const isNearCruise = Math.abs(w.altitude_ft - cruiseAlt) < 2000
          return (
            <div key={i} className={`winds-row ${isNearCruise ? 'highlight' : ''}`}>
              <span className="winds-alt">
                FL{Math.round(w.altitude_ft / 100).toString().padStart(3, '0')}
                <small>{w.altitude_ft.toLocaleString()} ft</small>
              </span>
              <span>{w.pressure_hpa} hPa</span>
              <span className="winds-dir">
                <span className="wind-arrow" style={{ transform: `rotate(${w.direction}deg)` }}>
                  <ArrowDown size={12} />
                </span>
                {w.direction}°
              </span>
              <span className={`winds-speed ${w.speed_kt > 40 ? 'strong' : ''}`}>
                {Math.round(w.speed_kt)} kt
              </span>
              <span className={w.temperature_c < 0 ? 'temp-neg' : 'temp-pos'}>
                {w.temperature_c > 0 ? '+' : ''}{w.temperature_c.toFixed(1)}°C
              </span>
            </div>
          )
        })}
      </div>

      {flightPlan?.segments?.length > 0 && (
        <div className="wind-components">
          <h4>Composantes de Vent en Route</h4>
          {flightPlan.segments.map((seg, i) => (
            <div key={i} className="wind-comp-row">
              <span className="wind-comp-leg">
                {seg.from_point.name} &rarr; {seg.to_point.name}
              </span>
              {seg.head_wind_kt != null && (
                <span className={`wind-comp-val ${seg.head_wind_kt > 0 ? 'tailwind' : 'headwind'}`}>
                  {seg.head_wind_kt > 0 ? (
                    <><ArrowUp size={10} /> +{Math.abs(seg.head_wind_kt)} kt</>
                  ) : (
                    <><ArrowDown size={10} /> {Math.abs(seg.head_wind_kt)} kt</>
                  )}
                </span>
              )}
              {seg.cross_wind_kt != null && (
                <span className="wind-comp-cross">
                  X {Math.abs(seg.cross_wind_kt)} kt
                </span>
              )}
              {seg.ground_speed_kt && (
                <span className="wind-comp-gs">GS {Math.round(seg.ground_speed_kt)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
