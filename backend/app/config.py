import os

AVWX_API_URL = "https://avwx.rest/api"
AVWX_API_KEY = os.getenv("AVWX_API_KEY", "")

OPEN_METEO_API_URL = "https://api.open-meteo.com/v1"

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

PRESSURE_LEVELS = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150]

FL_TO_PRESSURE = {
    "SFC": 1013,
    "FL020": 942,
    "FL050": 850,
    "FL100": 700,
    "FL140": 600,
    "FL180": 500,
    "FL240": 400,
    "FL300": 300,
    "FL340": 250,
    "FL390": 200,
    "FL450": 150,
}
