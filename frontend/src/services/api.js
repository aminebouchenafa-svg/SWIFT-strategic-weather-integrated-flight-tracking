import {
  generateDemoFlightPlan, generateDemoMetar, generateDemoWindsAloft,
  generateDemoGoNoGo, generateDemoDensityAlt, DEMO_AIRPORTS,
} from './demoData'

const BASE = '/api';
let demoMode = false;

async function request(url, options = {}) {
  try {
    const res = await fetch(`${BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }
    return res.json();
  } catch {
    demoMode = true;
    return null;
  }
}

export function isDemoMode() {
  return demoMode;
}

export async function getMetar(station) {
  const result = await request(`/weather/metar/${station}`);
  return result || generateDemoMetar(station);
}

export async function getTaf(station) {
  const result = await request(`/weather/taf/${station}`);
  return result || { raw: '', station, forecasts: [] };
}

export async function getWindsAloft(lat, lon) {
  const result = await request(`/weather/winds-aloft?lat=${lat}&lon=${lon}`);
  return result || generateDemoWindsAloft(lat, lon);
}

export async function getDensityAltitude(station) {
  const result = await request(`/weather/density-altitude/${station}`);
  return result || generateDemoDensityAlt(station);
}

export async function createFlightPlan(data) {
  const result = await request('/flight/plan', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result || generateDemoFlightPlan(data.departure, data.arrival, data.cruise_altitude_ft, data.true_airspeed_kt);
}

export async function checkGoNoGo(departure, arrival, minimums = null) {
  const result = await request('/flight/go-nogo', {
    method: 'POST',
    body: JSON.stringify({ departure, arrival, minimums }),
  });
  if (result) return result;
  const metarDep = generateDemoMetar(departure);
  const metarArr = generateDemoMetar(arrival);
  return generateDemoGoNoGo(metarDep, metarArr);
}

export async function getAirports() {
  const result = await request('/flight/airports');
  return result || Object.values(DEMO_AIRPORTS);
}
