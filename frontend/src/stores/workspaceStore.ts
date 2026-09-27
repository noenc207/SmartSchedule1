import { create } from 'zustand';
import type { MemberRole } from '../types/domain';
type WorkspaceState = { activeScheduleId: string | null; activeRole: MemberRole | null; setActiveScheduleId: (id: string | null) => void; setActiveRole: (role: MemberRole | null) => void };
export const useWorkspaceStore = create<WorkspaceState>((set) => ({ activeScheduleId: null, activeRole: null, setActiveScheduleId: (activeScheduleId) => set({ activeScheduleId }), setActiveRole: (activeRole) => set({ activeRole }) }));
