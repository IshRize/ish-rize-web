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
      {connected ? 'Live' : 'Live updates paused'}
    </span>
  );
}
