import { useState } from 'react'
import { Loader2, Navigation } from 'lucide-react'
import { createFlightPlan, getMetar, getTaf, getWindsAloft, checkGoNoGo, getDensityAltitude } from '../../services/api'
import './FlightPlanForm.css'

export default function FlightPlanForm({ onUpdate, loading, setLoading, flightPlan }) {
  const [departure, setDeparture] = useState('LFPG')
  const [arrival, setArrival] = useState('LFML')
  const [altitude, setAltitude] = useState(5000)
  const [tas, setTas] = useState(120)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const [fp, metarDep, metarArr, tafDep, goNoGo] = await Promise.all([
        createFlightPlan({
          departure: departure.toUpperCase(),
          arrival: arrival.toUpperCase(),
          cruise_altitude_ft: altitude,
          true_airspeed_kt: tas,
        }),
        getMetar(departure).catch(() => null),
        getMetar(arrival).catch(() => null),
        getTaf(departure).catch(() => null),
        checkGoNoGo(departure, arrival).catch(() => null),
      ])

      let windsAloft = null
      let densityAlt = null
      if (fp.waypoints?.length > 0) {
        const mid = fp.waypoints[Math.floor(fp.waypoints.length / 2)]
        windsAloft = await getWindsAloft(mid.latitude, mid.longitude).catch(() => null)
      }
      densityAlt = await getDensityAltitude(departure).catch(() => null)

      onUpdate({ flightPlan: fp, metarDep, metarArr, tafDep, windsAloft, goNoGo, densityAlt })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flight-plan-form" onSubmit={handleSubmit}>
      <h3 className="form-title">
        <Navigation size={16} />
        Navigation
      </h3>

      <div className="form-row">
        <div className="form-group">
          <label>Départ (OACI)</label>
          <input
            type="text"
            value={departure}
            onChange={e => setDeparture(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="LFPG"
          />
        </div>
        <div className="form-group">
          <label>Arrivée (OACI)</label>
          <input
            type="text"
            value={arrival}
            onChange={e => setArrival(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="LFML"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Altitude (ft)</label>
          <input
            type="number"
            value={altitude}
            onChange={e => setAltitude(parseInt(e.target.value) || 0)}
            step={500}
            min={500}
            max={45000}
          />
        </div>
        <div className="form-group">
          <label>TAS (kt)</label>
          <input
            type="number"
            value={tas}
            onChange={e => setTas(parseInt(e.target.value) || 0)}
            step={5}
            min={50}
            max={500}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
        {loading ? 'Calcul en cours...' : 'Calculer la Route'}
      </button>

      {error && <div className="form-error">{error}</div>}

      {flightPlan && (
        <div className="route-summary">
          <h4>Route calculée</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Distance</span>
              <span className="summary-value">{flightPlan.total_distance_nm} NM</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">ETE</span>
              <span className="summary-value">{Math.floor(flightPlan.total_ete_minutes / 60)}h{String(Math.round(flightPlan.total_ete_minutes % 60)).padStart(2, '0')}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Segments</span>
              <span className="summary-value">{flightPlan.segments?.length || 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">FL</span>
              <span className="summary-value">{Math.round(flightPlan.cruise_altitude_ft / 100).toString().padStart(3, '0')}</span>
            </div>
          </div>

          {flightPlan.segments?.map((seg, i) => (
            <div key={i} className="segment-row">
              <span className="seg-label">{seg.from_point.name}</span>
              <span className="seg-arrow">&rarr;</span>
              <span className="seg-label">{seg.to_point.name}</span>
              <span className="seg-detail">{seg.distance_nm} NM</span>
              <span className="seg-detail">{seg.true_course}°</span>
              {seg.ground_speed_kt && (
                <span className="seg-detail">GS {Math.round(seg.ground_speed_kt)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </form>
  )
}
