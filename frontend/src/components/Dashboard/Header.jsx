import { Plane, Radio } from 'lucide-react'
import './Header.css'

export default function Header() {
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
        <div className="status-indicator">
          <Radio size={14} />
          <span>LIVE</span>
        </div>
        <span className="header-time">{new Date().toUTCString().slice(0, -4)} UTC</span>
      </div>
    </header>
  )
}
