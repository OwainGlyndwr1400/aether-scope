// Open-Meteo Weather API — Free, no key needed
// Returns current weather conditions for a given location

export interface WeatherData {
  temperature: number
  windSpeed: number
  windDirection: number
  humidity: number
  pressure: number
  weatherCode: number
  description: string
  isDay: boolean
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
  55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Violent showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code,is_day`
  const res = await fetch(url)
  const data = await res.json()
  const c = data.current

  return {
    temperature: c.temperature_2m,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    humidity: c.relative_humidity_2m,
    pressure: c.surface_pressure,
    weatherCode: c.weather_code,
    description: WEATHER_CODES[c.weather_code] || 'Unknown',
    isDay: c.is_day === 1,
  }
}
