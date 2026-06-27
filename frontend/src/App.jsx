import Header from './components/Dashboard/Header'
import FlightMap from './components/Map/FlightMap'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <Header />
      <div className="app-body">
        <FlightMap />
      </div>
    </div>
  )
}
