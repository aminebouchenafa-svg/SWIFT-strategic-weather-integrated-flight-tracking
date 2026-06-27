import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { Mountain } from 'lucide-react'
import './VerticalProfile.css'

export default function VerticalProfile({ flightPlan, windsAloft }) {
  const data = useMemo(() => {
    if (!flightPlan?.segments?.length) return []
    let cumDist = 0
    const points = []

    points.push({
      distance: 0,
      name: flightPlan.segments[0].from_point.name,
      altitude: flightPlan.segments[0].from_point.altitude_ft || 0,
      cruiseAlt: flightPlan.cruise_altitude_ft,
      terrain: Math.max(0, (flightPlan.segments[0].from_point.altitude_ft || 0)),
    })

    for (const seg of flightPlan.segments) {
      cumDist += seg.distance_nm
      const wpAlt = seg.to_point.altitude_ft || 0
      points.push({
        distance: Math.round(cumDist),
        name: seg.to_point.name,
        altitude: Math.max(wpAlt, flightPlan.cruise_altitude_ft),
        cruiseAlt: flightPlan.cruise_altitude_ft,
        terrain: Math.max(0, wpAlt),
      })
    }

    if (points.length >= 3) {
      for (let i = 1; i < points.length - 1; i++) {
        points[i].altitude = flightPlan.cruise_altitude_ft
      }
    }

    return points
  }, [flightPlan])

  const windLayers = useMemo(() => {
    if (!windsAloft?.winds?.length) return []
    return windsAloft.winds.filter(w => w.altitude_ft <= (flightPlan?.cruise_altitude_ft || 10000) + 5000)
  }, [windsAloft, flightPlan])

  if (!data.length) {
    return (
      <div className="vp-empty">
        <Mountain size={24} />
        <span>Profil vertical disponible après calcul du plan de vol</span>
      </div>
    )
  }

  return (
    <div className="vertical-profile">
      <div className="vp-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="terrainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#78716c" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#44403c" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="distance"
              stroke="#4b5563"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              label={{ value: 'Distance (NM)', position: 'bottom', fill: '#6b7280', fontSize: 10 }}
            />
            <YAxis
              stroke="#4b5563"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              label={{ value: 'Altitude (ft)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: '#162032',
                border: '1px solid #2d3a4f',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#e5e7eb',
              }}
              formatter={(value, name) => {
                const labels = { altitude: 'Altitude', terrain: 'Terrain', cruiseAlt: 'Croisière' }
                return [`${value.toLocaleString()} ft`, labels[name] || name]
              }}
            />
            <ReferenceLine
              y={flightPlan.cruise_altitude_ft}
              stroke="#06b6d4"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="terrain"
              fill="url(#terrainGradient)"
              stroke="#78716c"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="altitude"
              fill="url(#altGradient)"
              stroke="#06b6d4"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {windLayers.length > 0 && (
        <div className="vp-winds">
          {windLayers.slice(0, 6).map((w, i) => (
            <div key={i} className="vp-wind-item">
              <span className="vp-wind-alt">FL{Math.round(w.altitude_ft / 100).toString().padStart(3, '0')}</span>
              <span className="vp-wind-dir">{w.direction}°</span>
              <span className="vp-wind-speed">{Math.round(w.speed_kt)}kt</span>
              <span className="vp-wind-temp">{w.temperature_c > 0 ? '+' : ''}{w.temperature_c.toFixed(0)}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
