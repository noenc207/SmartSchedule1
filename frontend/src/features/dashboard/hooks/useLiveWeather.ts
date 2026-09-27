import { useState, useEffect, useCallback } from 'react';
import { usePreferenceStore } from '../../../stores/preferenceStore';

export interface WeatherData {
  city: string;
  temp: number;
  icon: string;
  conditionText: string;
  isGps: boolean;
  loading: boolean;
  error: string | null;
}

export const KNOWN_CITIES: Record<string, { lat: number; lon: number; name: string }> = {
  'Quy Nhơn': { lat: 13.782, lon: 109.2197, name: 'Quy Nhơn' },
  'Hà Nội': { lat: 21.0285, lon: 105.8542, name: 'Hà Nội' },
  'Đà Nẵng': { lat: 16.0544, lon: 108.2022, name: 'Đà Nẵng' },
  'TP. Hồ Chí Minh': { lat: 10.8231, lon: 106.6297, name: 'TP. Hồ Chí Minh' },
  'Cần Thơ': { lat: 10.0452, lon: 105.7469, name: 'Cần Thơ' },
  'Hải Phòng': { lat: 20.8449, lon: 106.6881, name: 'Hải Phòng' },
  'Huế': { lat: 16.4637, lon: 107.5909, name: 'Huế' },
  'Nha Trang': { lat: 12.2388, lon: 109.1967, name: 'Nha Trang' },
};

function getWeatherInfo(code: number, isDay: number = 1): { icon: string; text: string } {
  if (code === 0) {
    return isDay ? { icon: '☀️', text: 'Nắng đẹp' } : { icon: '🌙', text: 'Quang đãng' };
  }
  if (code === 1 || code === 2) {
    return isDay ? { icon: '🌤️', text: 'Có mây nhẹ' } : { icon: '☁️', text: 'Mây rải rác' };
  }
  if (code === 3) {
    return { icon: '☁️', text: 'Nhiều mây' };
  }
  if (code === 45 || code === 48) {
    return { icon: '🌫️', text: 'Sương mù' };
  }
  if (code >= 51 && code <= 67) {
    return { icon: '🌧️', text: 'Có mưa' };
  }
  if (code >= 80 && code <= 82) {
    return { icon: '🌦️', text: 'Mưa rào' };
  }
  if (code >= 95 && code <= 99) {
    return { icon: '⛈️', text: 'Có giông' };
  }
  return { icon: '⛅', text: 'Thời tiết êm dịu' };
}

// Helper to find closest city from coordinates
function findClosestCity(lat: number, lon: number): string {
  let closest = 'Quy Nhơn';
  let minDist = Infinity;
  for (const [name, coord] of Object.entries(KNOWN_CITIES)) {
    const dist = Math.hypot(coord.lat - lat, coord.lon - lon);
    if (dist < minDist) {
      minDist = dist;
      closest = name;
    }
  }
  return closest;
}

export function useLiveWeather() {
  const { weatherLocationMode, weatherManualCity } = usePreferenceStore();

  const [weather, setWeather] = useState<WeatherData>({
    city: weatherManualCity || 'Quy Nhơn',
    temp: 28,
    icon: '🌤️',
    conditionText: 'Nắng đẹp',
    isGps: false,
    loading: true,
    error: null,
  });

  const fetchWeatherForCoords = useCallback(
    async (lat: number, lon: number, cityName: string, fromGps: boolean) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
        );
        if (!res.ok) throw new Error('Weather API error');
        const data = await res.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m ?? 28);
        const { icon, text } = getWeatherInfo(current.weather_code, current.is_day);

        setWeather({
          city: cityName,
          temp,
          icon,
          conditionText: text,
          isGps: fromGps,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        // Fallback gracefully
        setWeather((prev) => ({
          ...prev,
          city: cityName,
          loading: false,
          error: err?.message || 'Không thể tải thời tiết',
        }));
      }
    },
    []
  );

  const fetchWeather = useCallback(() => {
    setWeather((prev) => ({ ...prev, loading: true }));

    // If manual mode:
    if (weatherLocationMode === 'manual') {
      const cityConfig = KNOWN_CITIES[weatherManualCity] || KNOWN_CITIES['Quy Nhơn'];
      void fetchWeatherForCoords(cityConfig.lat, cityConfig.lon, cityConfig.name, false);
      return;
    }

    // Auto mode: try GPS via browser geolocation
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Attempt reverse geocoding for exact locality name
          let resolvedCity = findClosestCity(lat, lon);
          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const detected = geoData.city || geoData.principalSubdivision || geoData.locality;
              if (detected) {
                resolvedCity = detected.replace('Thành phố ', '').replace('Tỉnh ', '');
              }
            }
          } catch {
            // fallback to closest known city
          }

          void fetchWeatherForCoords(lat, lon, resolvedCity, true);
        },
        () => {
          // Geolocation permission denied or timeout: fallback to manual city or Quy Nhơn
          const cityConfig = KNOWN_CITIES[weatherManualCity] || KNOWN_CITIES['Quy Nhơn'];
          void fetchWeatherForCoords(cityConfig.lat, cityConfig.lon, cityConfig.name, false);
        },
        { timeout: 6000 }
      );
    } else {
      const cityConfig = KNOWN_CITIES[weatherManualCity] || KNOWN_CITIES['Quy Nhơn'];
      void fetchWeatherForCoords(cityConfig.lat, cityConfig.lon, cityConfig.name, false);
    }
  }, [weatherLocationMode, weatherManualCity, fetchWeatherForCoords]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return {
    ...weather,
    refresh: fetchWeather,
  };
}
