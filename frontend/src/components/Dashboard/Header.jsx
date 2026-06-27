import { useState, useEffect } from 'react'
import { Plane, Radio, MonitorX } from 'lucide-react'
import { isDemoMode } from '../../services/api'
import './Header.css'

export default function Header() {
  const [time, setTime] = useState(new Date())
  const demo = isDemoMode()

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="header">
      <div className="header-brand">
        <Plane size={22} className="header-icon" />
        <div>
          <h1>SWIFT</h1>
          <span className="header-subtitle">Strategic Weather Integrated Flight Tracking</span>
        </div>
      </div>
      <div className="header-status">
        {demo ? (
          <div className="status-indicator demo">
            <MonitorX size={14} />
            <span>DEMO</span>
          </div>
        ) : (
          <div className="status-indicator">
            <Radio size={14} />
            <span>LIVE</span>
          </div>
        )}
        <span className="header-time">{time.toUTCString().slice(0, -4)} UTC</span>
      </div>
    </header>
  )
}
