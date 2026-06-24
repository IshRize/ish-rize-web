/**
 * Module: Sidebar
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; UI/UX redesign Phase 2
 *
 * Purpose: Replaces AppHeader's horizontal nav bar (plus the theme toggle and
 *          sign-out buttons that used to sit next to it) with a single
 *          responsive sidebar:
 *            - desktop (lg+):  persistent rail, icon + label
 *            - tablet (md-lg): persistent rail, icon only
 *            - mobile (<md):   hidden; a hamburger button opens an overlay
 *                               drawer with icon + label (always labelled,
 *                               since there's no rail width constraint there)
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Icons, type IconProps } from '@/lib/icons';

type IconComponent = (props: IconProps) => React.ReactElement;

interface NavLink {
  href: string;
  label: string;
  icon: IconComponent;
}

// Master Timetable is read-only and visible to absolutely everyone (a
// lecturer needs to see time/venue before a department coordinator has
// decomposed their subject into a named offering) -- editing it means
// re-uploading via /ingestion (ADMIN-only there), not anything inline here.
const NAV_LINKS: NavLink[] = [
  { href: '/schedule', label: 'Schedule', icon: Icons.schedule },
  { href: '/master-timetable', label: 'Master Timetable', icon: Icons.masterTimetable },
  { href: '/clashes', label: 'Clashes', icon: Icons.clashes },
  { href: '/free-finder', label: 'Free finder', icon: Icons.freeFinder },
];

// Visible to any LECTURER (not just ones who currently coordinate a
// department, or who's currently assigned to teach anything) since both are
// scoped/assigned states that can change at any time; each page shows its
// own empty state otherwise.
const LECTURER_NAV_LINKS: NavLink[] = [
  { href: '/my-timetable', label: 'My Timetable', icon: Icons.myTimetable },
  { href: '/department-timetable', label: 'Department', icon: Icons.department },
  { href: '/teaching-load', label: 'Teaching Load', icon: Icons.teachingLoad },
];

// Department management, coordinator assignment, and master timetable
// ingestion are all ADMIN-only on the backend (the "academic affairs"
// function is just an ADMIN doing this work, not a separate role) -- hide
// these links rather than send other roles to a 403.
const ADMIN_NAV_LINKS: NavLink[] = [
  { href: '/ingestion', label: 'Ingestion', icon: Icons.ingestion },
  { href: '/admin', label: 'Admin', icon: Icons.admin },
];

function NavItem({
  link,
  active,
  labelClassName,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  labelClassName: string;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      title={link.label}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
        active
          ? 'bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]'
          : 'text-[var(--fg-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--fg-primary)]'
      }`}
    >
      <Icon size={20} className="shrink-0" />
      <span className={labelClassName}>{link.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isLecturerEligible = user?.role === 'LECTURER' || isAdmin;
  const navLinks: NavLink[] = [
    ...NAV_LINKS,
    ...(isLecturerEligible ? LECTURER_NAV_LINKS : []),
    ...(isAdmin ? ADMIN_NAV_LINKS : []),
  ];

  function close(): void {
    setMobileOpen(false);
  }

  async function handleLogout(): Promise<void> {
    await logout();
    router.push('/login');
  }

  function renderContent(labelClassName: string, onNavigate?: () => void): React.ReactElement {
    return (
      <>
        <div className="flex items-center px-3 py-4">
          <span className={`text-lg font-semibold text-[var(--fg-primary)] ${labelClassName}`}>IshRize</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {navLinks.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              active={pathname === link.href}
              labelClassName={labelClassName}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
        <div className="space-y-1 border-t border-[var(--border-default)] px-2 py-2">
          <ThemeToggle variant="row" labelClassName={labelClassName} />
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--fg-primary)]"
          >
            <Icons.logout size={20} className="shrink-0" />
            <span className={labelClassName}>Sign out</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-30 rounded-md border border-[var(--border-default)] bg-[var(--bg-alternate)] p-2 text-[var(--fg-primary)] md:hidden"
      >
        <Icons.menu size={20} />
      </button>

      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-alternate)] md:flex lg:w-56">
        {renderContent('hidden lg:inline')}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
          <aside className="relative flex h-full w-64 flex-col bg-[var(--bg-alternate)]">
            <button
              type="button"
              onClick={close}
              aria-label="Close navigation menu"
              className="absolute right-3 top-4 rounded-md p-1 text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
            >
              <Icons.close size={20} />
            </button>
            {renderContent('inline', close)}
          </aside>
        </div>
      )}
    </>
  );
}
