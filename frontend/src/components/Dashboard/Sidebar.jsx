import { Plane, Cloud, Shield, Wind } from 'lucide-react'
import FlightPlanForm from '../FlightPlan/FlightPlanForm'
import GoNoGoPanel from '../FlightPlan/GoNoGoPanel'
import WindsPanel from '../Weather/WindsPanel'
import './Sidebar.css'

const TABS = [
  { id: 'plan', icon: Plane, label: 'Plan de Vol' },
  { id: 'gonogo', icon: Shield, label: 'Go/No-Go' },
  { id: 'winds', icon: Wind, label: 'Vents' },
]

export default function Sidebar({
  activePanel, onPanelChange, flightPlan,
  metarDep, metarArr, tafDep, windsAloft,
  goNoGo, densityAlt,
  onFlightPlanUpdate, loading, setLoading,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`sidebar-tab ${activePanel === id ? 'active' : ''}`}
            onClick={() => onPanelChange(id)}
            title={label}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-content">
        {activePanel === 'plan' && (
          <FlightPlanForm
            onUpdate={onFlightPlanUpdate}
            loading={loading}
            setLoading={setLoading}
            flightPlan={flightPlan}
          />
        )}
        {activePanel === 'gonogo' && (
          <GoNoGoPanel goNoGo={goNoGo} densityAlt={densityAlt} />
        )}
        {activePanel === 'winds' && (
          <WindsPanel windsAloft={windsAloft} flightPlan={flightPlan} />
        )}
      </div>
    </aside>
  )
}
