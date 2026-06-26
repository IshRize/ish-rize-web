/**
 * Module: courseCode
 * Layer:  lib (pure)
 * Context: See COPILOT_CONTEXT.md; dept-coordinator tooling
 *
 * Purpose: A bare subject code ("MATH", "MATH (C)") is just a placeholder --
 *          a department coordinator still has to decide which specific
 *          course that period actually is. A code that already combines
 *          letters+digits in the standard format ("NURS467") IS a specific,
 *          real course code already -- the leading digit of the number is
 *          the level (467 -> 400, 101 -> 100), the same convention the
 *          backend's own course-code validation expects. Mirrors
 *          ish-rize-backend's departmentSync.ts parseCourseCode exactly.
 */
const COURSE_CODE_PATTERN = /^([A-Z]{2,4})(\d{3,4})$/;

export function parseCourseCode(subjectCode: string): { code: string; level: number } | null {
  const normalized = subjectCode.trim().toUpperCase();
  const match = normalized.match(COURSE_CODE_PATTERN);
  if (!match) return null;
  const digits = match[2];
  const level = Number(digits[0]) * 100;
  return { code: normalized, level };
}
