import { ShieldCheck, ShieldAlert, ShieldX, Thermometer } from 'lucide-react'
import './GoNoGoPanel.css'

const STATUS_CONFIG = {
  GO: { icon: ShieldCheck, color: 'var(--go)', label: 'GO' },
  MARGINAL: { icon: ShieldAlert, color: 'var(--marginal)', label: 'MARGINAL' },
  NOGO: { icon: ShieldX, color: 'var(--nogo)', label: 'NO-GO' },
}

export default function GoNoGoPanel({ goNoGo, densityAlt }) {
  if (!goNoGo) {
    return (
      <div className="gonogo-empty">
        <ShieldCheck size={32} />
        <p>Calculez un plan de vol pour obtenir l'analyse Go/No-Go</p>
      </div>
    )
  }

  const config = STATUS_CONFIG[goNoGo.overall] || STATUS_CONFIG.GO
  const StatusIcon = config.icon

  return (
    <div className="gonogo-panel">
      <div className="gonogo-overall" style={{ borderColor: config.color }}>
        <StatusIcon size={28} style={{ color: config.color }} />
        <div>
          <div className="gonogo-label">Décision</div>
          <div className="gonogo-status" style={{ color: config.color }}>
            {config.label}
          </div>
        </div>
      </div>

      <div className="gonogo-items">
        {goNoGo.items.map((item, i) => {
          const c = STATUS_CONFIG[item.status] || STATUS_CONFIG.GO
          return (
            <div key={i} className="gonogo-item">
              <div className="gonogo-item-dot" style={{ background: c.color }} />
              <div className="gonogo-item-info">
                <span className="gonogo-item-cat">{item.category}</span>
                <span className="gonogo-item-param">{item.parameter}</span>
              </div>
              <div className="gonogo-item-values">
                <span className="gonogo-item-current">{item.current_value}</span>
                <span className="gonogo-item-limit">min: {item.limit_value}</span>
              </div>
            </div>
          )
        })}
      </div>

      {densityAlt && (
        <div className="density-alt-card">
          <h4><Thermometer size={14} /> Altitude Densité - {densityAlt.station}</h4>
          <div className="density-grid">
            <div className="density-item">
              <span className="density-label">Élévation</span>
              <span className="density-value">{densityAlt.elevation_ft} ft</span>
            </div>
            <div className="density-item">
              <span className="density-label">Temp</span>
              <span className="density-value">{densityAlt.temperature_c}°C</span>
            </div>
            <div className="density-item">
              <span className="density-label">QNH</span>
              <span className="density-value">{densityAlt.qnh_hpa} hPa</span>
            </div>
            <div className="density-item">
              <span className="density-label">Alt. Pression</span>
              <span className="density-value">{densityAlt.pressure_altitude_ft} ft</span>
            </div>
            <div className="density-item highlight">
              <span className="density-label">Alt. Densité</span>
              <span className="density-value">{densityAlt.density_altitude_ft} ft</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
