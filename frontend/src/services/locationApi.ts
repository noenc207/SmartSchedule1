import apiClient from './apiClient';
import type { UserLocation, UserLocationCategory } from '../types/domain';

export type UserLocationInput = {
  name: string;
  category: UserLocationCategory;
  address?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  building?: string | null;
  room?: string | null;
  isFavorite?: boolean;
};

export const locationApi = {
  async list(): Promise<UserLocation[]> {
    return (await apiClient.get<UserLocation[]>('/locations')).data;
  },

  async get(id: string): Promise<UserLocation> {
    return (await apiClient.get<UserLocation>(`/locations/${id}`)).data;
  },

  async create(input: UserLocationInput): Promise<UserLocation> {
    return (await apiClient.post<UserLocation>('/locations', input)).data;
  },

  async update(id: string, input: Partial<UserLocationInput>): Promise<UserLocation> {
    return (await apiClient.put<UserLocation>(`/locations/${id}`, input)).data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/locations/${id}`);
  },

  /**
   * Geocodes an address string using free OpenStreetMap Nominatim API with fallback.
   */
  async geocodeAddress(query: string): Promise<{ lat: number; lng: number; displayName: string }[]> {
    if (!query || !query.trim()) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'vi,en' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data as Array<{ lat: string; lon: string; display_name: string }>).map((item) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
      }));
    } catch {
      return [];
    }
  },
};
