/**
 * Module: scheduleSelectionStore
 * Layer:  store (Zustand)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: The currently selected organization and term, shared across the
 *          Schedule, Clashes, and Free-finder pages so navigating between them
 *          keeps the same context instead of resetting to defaults each time.
 */
import { create } from 'zustand';

interface ScheduleSelectionState {
  organizationId: string;
  termId: string;
  setOrganizationId(id: string): void;
  setTermId(id: string): void;
}

export const useScheduleSelectionStore = create<ScheduleSelectionState>((set) => ({
  organizationId: '',
  termId: '',
  setOrganizationId(id) {
    set({ organizationId: id, termId: '' });
  },
  setTermId(id) {
    set({ termId: id });
  },
}));
