import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Weather {
  tempF: number;
  code: number;
  city: string;
  updated: number;
}

const CACHE_KEY = '@nsos_weather_v1';
const LOC_KEY = '@nsos_weather_loc_v1';
const FRESH_MS = 30 * 60 * 1000; // 30 minutes

interface Loc {
  lat: number;
  lon: number;
  city: string;
}

/** WMO weather code → emoji + short label. */
export const describeWeather = (code: number): {icon: string; label: string} => {
  if (code === 0) return {icon: '☀️', label: 'Clear'};
  if (code <= 2) return {icon: '🌤️', label: 'Partly cloudy'};
  if (code === 3) return {icon: '☁️', label: 'Overcast'};
  if (code <= 48) return {icon: '🌫️', label: 'Fog'};
  if (code <= 57) return {icon: '🌦️', label: 'Drizzle'};
  if (code <= 67) return {icon: '🌧️', label: 'Rain'};
  if (code <= 77) return {icon: '🌨️', label: 'Snow'};
  if (code <= 82) return {icon: '🌧️', label: 'Showers'};
  if (code <= 86) return {icon: '🌨️', label: 'Snow showers'};
  if (code <= 99) return {icon: '⛈️', label: 'Thunderstorm'};
  return {icon: '🌡️', label: 'Weather'};
};

const getLocation = async (): Promise<Loc | null> => {
  try {
    const cached = await AsyncStorage.getItem(LOC_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  try {
    // Keyless IP geolocation (no permission needed).
    const {data} = await axios.get('https://ipapi.co/json/', {timeout: 12000});
    if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
      const loc: Loc = {lat: data.latitude, lon: data.longitude, city: data.city ?? ''};
      await AsyncStorage.setItem(LOC_KEY, JSON.stringify(loc));
      return loc;
    }
  } catch (e) {
    console.error('weather location failed:', e);
  }
  return null;
};

/** Returns current weather, using a 30-minute cache. Null if unavailable. */
export const getWeather = async (): Promise<Weather | null> => {
  try {
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached: Weather = JSON.parse(cachedRaw);
      if (Date.now() - cached.updated < FRESH_MS) return cached;
    }
  } catch {}

  const loc = await getLocation();
  if (!loc) return null;

  try {
    const {data} = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: loc.lat,
        longitude: loc.lon,
        current_weather: true,
        temperature_unit: 'fahrenheit',
      },
      timeout: 12000,
    });
    const cw = data?.current_weather;
    if (cw && typeof cw.temperature === 'number') {
      const w: Weather = {
        tempF: Math.round(cw.temperature),
        code: cw.weathercode ?? 0,
        city: loc.city,
        updated: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(w));
      return w;
    }
  } catch (e) {
    console.error('weather fetch failed:', e);
  }
  return null;
};
