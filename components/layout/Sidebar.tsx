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
import { useIsCoordinator } from '@/hooks/useIsCoordinator';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { OrgSwitcher } from '@/components/layout/OrgSwitcher';
import { Icons, type IconProps } from '@/lib/icons';

type IconComponent = (props: IconProps) => React.ReactElement;

interface NavLink {
  href: string;
  label: string;
  icon: IconComponent;
}

const NAV_LINKS: NavLink[] = [
  { href: '/schedule', label: 'Schedule', icon: Icons.schedule },
  { href: '/clashes', label: 'Clashes', icon: Icons.clashes },
  { href: '/free-finder', label: 'Free finder', icon: Icons.freeFinder },
];

// The master file is the coarse, pre-decomposition import -- only someone
// who actually has to decompose a slice of it (a coordinator) or an ADMIN
// needs to see it; shown separately from NAV_LINKS so it can be filtered by
// useIsCoordinator() rather than role alone.
const MASTER_TIMETABLE_LINK: NavLink = {
  href: '/master-timetable',
  label: 'Master Timetable',
  icon: Icons.masterTimetable,
};

// A coordinator's own management screen (lecturers, course ownership, and
// teaching load in their department) -- same useIsCoordinator() gate as the
// Master Timetable link above, not role-based, since coordination is a
// scoped permission.
const DEPARTMENT_ADMIN_LINK: NavLink = {
  href: '/department-admin',
  label: 'Coordinator Hub',
  icon: Icons.departmentAdmin,
};

// Visible to any LECTURER (not just ones who currently coordinate a
// department, or who's currently assigned to teach anything) since both are
// scoped/assigned states that can change at any time; each page shows its
// own empty state otherwise.
const LECTURER_NAV_LINKS: NavLink[] = [
  { href: '/my-timetable', label: 'My Timetable', icon: Icons.myTimetable },
  { href: '/department-timetable', label: 'Department', icon: Icons.department },
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
  const { isCoordinator } = useIsCoordinator();

  const isAdmin = user?.role === 'ADMIN';
  const isLecturerEligible = user?.role === 'LECTURER' || isAdmin;
  const navLinks: NavLink[] = [
    NAV_LINKS[0],
    ...(isCoordinator ? [MASTER_TIMETABLE_LINK, DEPARTMENT_ADMIN_LINK] : []),
    ...NAV_LINKS.slice(1),
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
        <OrgSwitcher labelClassName={labelClassName} />
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
          <NavItem
            link={{ href: '/profile', label: 'Profile', icon: Icons.profile }}
            active={pathname === '/profile'}
            labelClassName={labelClassName}
            onNavigate={onNavigate}
          />
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
