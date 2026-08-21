/**
 * Module: analytics
 * Layer:  lib (utility)
 *
 * Typed PostHog event helpers. Every user-facing action that matters for
 * product analytics should call one of these instead of raw posthog.capture.
 *
 * Exports:
 *   analytics — object with typed event methods
 */
import { posthog } from '@/lib/posthog';
import type { User } from '@/types/scheduling';

export const analytics = {
  identify(user: User) {
    if (!posthog.__loaded) return;
    posthog.identify(user.id, {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    });
  },

  reset() {
    if (!posthog.__loaded) return;
    posthog.reset();
  },

  timetableImported(props: { organizationId: string; rowCount: number }) {
    posthog.capture('timetable_imported', props);
  },

  sessionStarted(props: { courseId: string; sessionId: string }) {
    posthog.capture('session_started', props);
  },

  attendanceMarked(props: { sessionId: string; status: string }) {
    posthog.capture('attendance_marked', props);
  },

  scheduleViewed(props: { view: 'day' | 'week'; organizationId: string }) {
    posthog.capture('schedule_viewed', props);
  },

  insightViewed(props: { insightType: string }) {
    posthog.capture('insight_viewed', props);
  },

  orgCreated(props: { organizationId: string; orgType: string }) {
    posthog.capture('org_created', props);
  },

  memberInvited(props: { organizationId: string; role: string }) {
    posthog.capture('member_invited', props);
  },

  checkoutStarted(props: { plan: string }) {
    posthog.capture('checkout_started', props);
  },
};
