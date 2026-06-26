/**
 * Module: Icon registry
 * Layer:  lib (client-side)
 * Context: See COPILOT_CONTEXT.md; UI/UX redesign Phase 1
 *
 * Purpose: The ONE place every page/component imports icons from, by
 *          semantic name (Icons.sun, Icons.profile, Icons.eyeOff) -- never a
 *          raw @mdi/js / @mui/icons-material / FontAwesome import scattered
 *          across the app. Swapping an icon's underlying source later is a
 *          one-line change here, invisible to every consumer.
 *
 *          @mdi/js (Material Design Icons) is the primary source -- it's the
 *          exact icon set the mobile app's MaterialCommunityIcons wraps, so
 *          using it here gives true visual parity across platforms, not just
 *          a conceptual match. MUI/FontAwesome are available as fallbacks for
 *          anything MDI doesn't cover well, following the same `IconProps`
 *          shape so callers never need to know which library an icon came
 *          from.
 *
 * Notes:
 * - Every entry is a component accepting the same {size, color, className}
 *   shape, regardless of source library.
 * - Only icons with a real, current consumer are wired up below as later
 *   phases land; the rest of the planned set is reserved here as comments so
 *   the full mapping lives in one place rather than being rediscovered phase
 *   by phase.
 */
import {
  mdiWhiteBalanceSunny,
  mdiWeatherNight,
  mdiCalendarMonthOutline,
  mdiViewGridOutline,
  mdiCalendarAccountOutline,
  mdiOfficeBuildingOutline,
  mdiScaleBalance,
  mdiAlertOctagonOutline,
  mdiMagnify,
  mdiFileUploadOutline,
  mdiShieldCrownOutline,
  mdiAccountCircleOutline,
  mdiMenu,
  mdiClose,
  mdiLogoutVariant,
  mdiEmailOutline,
  mdiLockOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiAlertCircleOutline,
  mdiLockReset,
  mdiIdentifier,
  mdiCalendarCheckOutline,
  mdiShieldLockOutline,
  mdiInformationOutline,
  mdiSchoolOutline,
  mdiHumanMaleBoard,
  mdiChevronRight,
} from '@mdi/js';
import { MdiIcon } from '@/components/ui/MdiIcon';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

function mdiIcon(path: string) {
  return function Icon(props: IconProps) {
    return <MdiIcon path={path} {...props} />;
  };
}

export const Icons = {
  // Theme toggle (Phase 1)
  sun: mdiIcon(mdiWhiteBalanceSunny),
  moon: mdiIcon(mdiWeatherNight),

  // Sidebar navigation (Phase 2)
  schedule: mdiIcon(mdiCalendarMonthOutline),
  masterTimetable: mdiIcon(mdiViewGridOutline),
  myTimetable: mdiIcon(mdiCalendarAccountOutline),
  department: mdiIcon(mdiOfficeBuildingOutline),
  teachingLoad: mdiIcon(mdiScaleBalance),
  clashes: mdiIcon(mdiAlertOctagonOutline),
  freeFinder: mdiIcon(mdiMagnify),
  ingestion: mdiIcon(mdiFileUploadOutline),
  admin: mdiIcon(mdiShieldCrownOutline),
  profile: mdiIcon(mdiAccountCircleOutline),
  menu: mdiIcon(mdiMenu),
  close: mdiIcon(mdiClose),
  logout: mdiIcon(mdiLogoutVariant),

  // Auth page (Phase 4)
  email: mdiIcon(mdiEmailOutline),
  lock: mdiIcon(mdiLockOutline),
  eye: mdiIcon(mdiEyeOutline),
  eyeOff: mdiIcon(mdiEyeOffOutline),
  alertCircle: mdiIcon(mdiAlertCircleOutline),

  // Profile page (Phase 3)
  lockReset: mdiIcon(mdiLockReset),
  identifier: mdiIcon(mdiIdentifier),
  calendarCheck: mdiIcon(mdiCalendarCheckOutline),
  shieldLock: mdiIcon(mdiShieldLockOutline),
  information: mdiIcon(mdiInformationOutline),
  // Role badges on the profile hero card -- matches the mobile ProfileScreen's
  // per-role icon (STUDENT/LECTURER use these; ADMIN reuses Icons.admin above).
  roleStudent: mdiIcon(mdiSchoolOutline),
  roleLecturer: mdiIcon(mdiHumanMaleBoard),
  chevronRight: mdiIcon(mdiChevronRight),
} as const;
