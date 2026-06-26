/**
 * Module: dayNames
 * Layer:  lib (pure)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Every grid (Schedule, Department, Master Timetable) renders day
 *          columns from the org's weekDays config, which uses short codes
 *          (MON/TUE/...). Display-only full names, in one place so every
 *          grid stays consistent -- the underlying day codes are unchanged,
 *          this never touches data, only what's shown.
 */
const DAY_NAMES: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

export function dayLabel(day: string): string {
  return DAY_NAMES[day] ?? day;
}
