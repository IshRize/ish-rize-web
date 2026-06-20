/**
 * Module: LiveSyncIndicator
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: A small pulsing presence dot (Slack/Figma-style) signaling live
 *          real-time sync on the schedule view. Reflects the actual Socket.io
 *          connection state from useScheduleSocket — solid pulsing green when
 *          connected, static muted when not, rather than a decorative dot that
 *          always claims to be live.
 */
interface LiveSyncIndicatorProps {
  connected: boolean;
}

export function LiveSyncIndicator({ connected }: LiveSyncIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{
          backgroundColor: connected ? 'var(--fg-free-slot)' : 'var(--fg-muted)',
          animation: connected ? 'pulse-live 1.6s ease-in-out infinite' : undefined,
        }}
        aria-hidden="true"
      />
      {connected ? 'Live' : 'Offline'}
    </span>
  );
}
