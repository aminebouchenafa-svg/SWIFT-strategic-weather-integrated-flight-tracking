import { useState, useCallback } from 'react'
import Header from './components/Dashboard/Header'
import Sidebar from './components/Dashboard/Sidebar'
import FlightMap from './components/Map/FlightMap'
import VerticalProfile from './components/VerticalProfile/VerticalProfile'
import WeatherPanel from './components/Weather/WeatherPanel'
import './App.css'

export default function App() {
  const [flightPlan, setFlightPlan] = useState(null)
  const [metarDep, setMetarDep] = useState(null)
  const [metarArr, setMetarArr] = useState(null)
  const [tafDep, setTafDep] = useState(null)
  const [windsAloft, setWindsAloft] = useState(null)
  const [goNoGo, setGoNoGo] = useState(null)
  const [densityAlt, setDensityAlt] = useState(null)
  const [activePanel, setActivePanel] = useState('plan')
  const [loading, setLoading] = useState(false)
  const [bottomPanel, setBottomPanel] = useState('profile')

  const handleFlightPlanUpdate = useCallback((data) => {
    setFlightPlan(data.flightPlan)
    setMetarDep(data.metarDep)
    setMetarArr(data.metarArr)
    setTafDep(data.tafDep)
    setWindsAloft(data.windsAloft)
    setGoNoGo(data.goNoGo)
    setDensityAlt(data.densityAlt)
  }, [])

  return (
    <div className="app">
      <Header />
      <div className="app-body">
        <Sidebar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          flightPlan={flightPlan}
          metarDep={metarDep}
          metarArr={metarArr}
          tafDep={tafDep}
          windsAloft={windsAloft}
          goNoGo={goNoGo}
          densityAlt={densityAlt}
          onFlightPlanUpdate={handleFlightPlanUpdate}
          loading={loading}
          setLoading={setLoading}
        />
        <div className="main-content">
          <FlightMap
            flightPlan={flightPlan}
            metarDep={metarDep}
            metarArr={metarArr}
          />
          <div className="bottom-panels">
            <div className="bottom-tabs">
              <button
                className={bottomPanel === 'profile' ? 'active' : ''}
                onClick={() => setBottomPanel('profile')}
              >
                Profil Vertical
              </button>
              <button
                className={bottomPanel === 'weather' ? 'active' : ''}
                onClick={() => setBottomPanel('weather')}
              >
                Briefing Météo
              </button>
            </div>
            {bottomPanel === 'profile' && (
              <VerticalProfile
                flightPlan={flightPlan}
                windsAloft={windsAloft}
              />
            )}
            {bottomPanel === 'weather' && (
              <WeatherPanel
                metarDep={metarDep}
                metarArr={metarArr}
                tafDep={tafDep}
                densityAlt={densityAlt}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
