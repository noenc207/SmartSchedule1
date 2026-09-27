import apiClient from './apiClient';
import type { LocationRef, MobilityFinding, TravelEstimate } from '../types/domain';

export type CandidateMobilityPayload = {
  scheduleId: string;
  startsAt: string;
  endsAt: string;
  title: string;
  location?: string;
  locationId?: string | null;
  excludeEventId?: string;
};

export const travelApi = {
  async listLocations(): Promise<LocationRef[]> {
    return (await apiClient.get<LocationRef[]>('/locations')).data;
  },

  async getTravelEstimate(fromLocationId: string, toLocationId: string): Promise<TravelEstimate> {
    return (await apiClient.get<TravelEstimate>('/travel/estimate', {
      params: { from: fromLocationId, to: toLocationId },
    })).data;
  },

  async acknowledgeWarning(signature: string, fromEventId?: string, toEventId?: string): Promise<void> {
    await apiClient.post('/mobility/acknowledge', {
      signature,
      fromEventId,
      toEventId,
    });
  },

  async checkCandidateMobility(payload: CandidateMobilityPayload): Promise<MobilityFinding> {
    return (await apiClient.post<MobilityFinding>('/events/check-mobility', payload)).data;
  },
};
