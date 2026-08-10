/**
 * Module: NotificationBell
 * Layer:  web-component (client)
 * Context: Stage 13 WS3 — member-facing scheduling notifications
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  MapPin,
  XCircle,
  CalendarPlus,
  RefreshCw,
} from 'lucide-react';
import { notificationApi, lastResponseTimeMs } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AppNotification, NotificationType } from '@/types/scheduling';

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  ROOM_CHANGED: MapPin,
  SESSION_CANCELLED: XCircle,
  SESSION_ADDED: CalendarPlus,
  BOOKING_UPDATED: RefreshCw,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  ROOM_CHANGED: 'text-[var(--fg-pending)]',
  SESSION_CANCELLED: 'text-[var(--fg-clash)]',
  SESSION_ADDED: 'text-[var(--fg-free-slot)]',
  BOOKING_UPDATED: 'text-[var(--accent-primary)]',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [apiTime, setApiTime] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationApi.list({ unreadOnly: false });
      setApiTime(lastResponseTimeMs);
      return res;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.items ?? [];

  const bellBtn = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
        collapsed && 'justify-center px-2',
        open && 'bg-accent text-foreground',
      )}
    >
      <Bell size={20} className="shrink-0" />
      {unreadCount > 0 && (
        <span className="absolute left-6 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--fg-clash)] px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {!collapsed && <span>Notifications</span>}
    </button>
  );

  return (
    <div className="relative">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{bellBtn}</TooltipTrigger>
          <TooltipContent side="right">
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </TooltipContent>
        </Tooltip>
      ) : (
        bellBtn
      )}

      {open && (
        <div
          className={cn(
            'absolute z-50 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg',
            collapsed ? 'bottom-0 left-16 w-80' : 'bottom-0 left-full ml-2 w-80',
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                className="h-7 gap-1 text-xs"
              >
                <CheckCheck size={14} />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={32} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <ul>
                {notifications.slice(0, 20).map((n: AppNotification) => {
                  const Icon = TYPE_ICONS[n.type] ?? Bell;
                  const colorClass = TYPE_COLORS[n.type] ?? 'text-muted-foreground';
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'flex gap-3 border-b border-[var(--border-default)] px-4 py-3 last:border-b-0',
                        !n.read && 'bg-[var(--bg-alternate)]',
                      )}
                    >
                      <Icon size={16} className={cn('mt-0.5 shrink-0', colorClass)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm', !n.read && 'font-medium')}>{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markRead.mutate(n.id)}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {apiTime && (
            <div className="border-t border-[var(--border-default)] px-4 py-1.5">
              <p className="text-xs tabular-nums text-[var(--fg-muted)]">
                API: {apiTime}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
