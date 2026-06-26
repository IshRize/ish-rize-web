/**
 * Module: scheduleSelectionStore
 * Layer:  store (Zustand)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: The currently selected organization, term, level filter, and
 *          department -- shared across pages so navigating between them
 *          (Schedule, Clashes, Free-finder, Master Timetable, Department
 *          Timetable, Teaching Load) keeps the same context instead of
 *          resetting to defaults each time. Plain in-memory Zustand (no
 *          persist middleware) is intentional: this should survive
 *          client-side navigation within the app, not a hard page reload.
 */
import { create } from 'zustand';

interface ScheduleSelectionState {
  organizationId: string;
  termId: string;
  levelFilter: string;
  departmentOrgUnitId: string;
  setOrganizationId(id: string): void;
  setTermId(id: string): void;
  setLevelFilter(level: string): void;
  setDepartmentOrgUnitId(id: string): void;
}

export const useScheduleSelectionStore = create<ScheduleSelectionState>((set) => ({
  organizationId: '',
  termId: '',
  levelFilter: '',
  departmentOrgUnitId: '',
  setOrganizationId(id) {
    set({ organizationId: id, termId: '' });
  },
  setTermId(id) {
    set({ termId: id });
  },
  setLevelFilter(level) {
    set({ levelFilter: level });
  },
  setDepartmentOrgUnitId(id) {
    set({ departmentOrgUnitId: id });
  },
}));
