const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getMetar(station) {
  return request(`/weather/metar/${station}`);
}

export async function getTaf(station) {
  return request(`/weather/taf/${station}`);
}

export async function getWindsAloft(lat, lon) {
  return request(`/weather/winds-aloft?lat=${lat}&lon=${lon}`);
}

export async function getDensityAltitude(station) {
  return request(`/weather/density-altitude/${station}`);
}

export async function createFlightPlan(data) {
  return request('/flight/plan', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkGoNoGo(departure, arrival, minimums = null) {
  return request('/flight/go-nogo', {
    method: 'POST',
    body: JSON.stringify({ departure, arrival, minimums }),
  });
}

export async function getAirports() {
  return request('/flight/airports');
}
