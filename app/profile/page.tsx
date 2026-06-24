/**
 * Module: Profile page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md; UI/UX redesign Phase 3
 *
 * Purpose: Per-user profile, reachable from the sidebar. Mirrors the mobile
 *          app's ProfileScreen (hero card with role-tinted avatar, email,
 *          member-since; a settings menu for Change Password/Theme/About) --
 *          porting only what applies to this app's actual feature set.
 *          Mobile-only items (Analytics, Attendance, Growth, Invitations,
 *          Notifications, Privacy) don't have a web equivalent and are
 *          intentionally left out.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { Icons, type IconProps } from '@/lib/icons';

type IconComponent = (props: IconProps) => React.ReactElement;

const ROLE_PRESENTATION: Record<string, { icon: IconComponent; color: string; label: string }> = {
  STUDENT: { icon: Icons.roleStudent, color: 'var(--accent-primary)', label: 'STUDENT' },
  LECTURER: { icon: Icons.roleLecturer, color: 'var(--fg-free-slot)', label: 'LECTURER' },
  ADMIN: { icon: Icons.admin, color: 'var(--fg-clash)', label: 'ADMIN' },
};

function InfoRow({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-alternate)] text-[var(--fg-muted)]">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[var(--fg-muted)]">{label}</p>
        <p className="truncate text-sm font-medium text-[var(--fg-primary)]">{value}</p>
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  value,
  onClick,
  expanded,
}: {
  icon: IconComponent;
  label: string;
  value?: string;
  onClick?: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 border-b border-[var(--border-default)] px-4 py-3.5 text-left last:border-b-0 disabled:cursor-default"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-alternate)] text-[var(--fg-muted)]">
        <Icon size={20} />
      </div>
      <span className="flex-1 text-sm font-medium text-[var(--fg-primary)]">{label}</span>
      {value && <span className="text-sm text-[var(--fg-muted)]">{value}</span>}
      {onClick && (
        <Icons.chevronRight
          size={20}
          className={`text-[var(--fg-muted)] transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      )}
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  const role = ROLE_PRESENTATION[user.role] ?? ROLE_PRESENTATION.STUDENT;
  const RoleIcon = role.icon;
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <h1 className="mb-6 text-xl font-semibold text-[var(--fg-primary)]">Profile</h1>

      <section className="mx-auto max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center">
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2"
          style={{ borderColor: `color-mix(in srgb, ${role.color} 40%, transparent)` }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${role.color} 16%, transparent)` }}
          >
            <RoleIcon size={36} color={role.color} />
          </div>
        </div>

        <h2 className="mt-3 text-lg font-semibold text-[var(--fg-primary)]">
          {user.firstName} {user.lastName}
        </h2>

        <span
          className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `color-mix(in srgb, ${role.color} 16%, transparent)`, color: role.color }}
        >
          <RoleIcon size={13} color={role.color} />
          {role.label}
        </span>

        <div className="mt-4 border-t border-[var(--border-default)] pt-2 text-left">
          <InfoRow icon={Icons.email} label="Email" value={user.email} />
          <InfoRow icon={Icons.identifier} label="User ID" value={user.id} />
          <InfoRow icon={Icons.calendarCheck} label="Member since" value={memberSince} />
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-md overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <MenuRow
          icon={Icons.lockReset}
          label="Change Password"
          onClick={() => setChangePasswordOpen((open) => !open)}
          expanded={changePasswordOpen}
        />
        {changePasswordOpen && <ChangePasswordForm onClose={() => setChangePasswordOpen(false)} />}

        <div className="border-b border-[var(--border-default)] px-1 py-1 last:border-b-0">
          <ThemeToggle variant="row" labelClassName="inline" />
        </div>

        <MenuRow icon={Icons.information} label="About" value="v1.0.0" />
      </section>

      <p className="mx-auto mt-6 max-w-md text-center text-xs text-[var(--fg-muted)]">
        IshRize Scheduling Intelligence
      </p>
    </AppShell>
  );
}
