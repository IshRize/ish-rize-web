'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  AlertTriangle,
  Search,
  Upload,
  Users,
  Network,
  MapPin,
  BookOpen,
  Layers,
  Calendar,
  Settings,
  ScrollText,
  UserCircle,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  GaugeCircle,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const STORAGE_KEY = 'ishrize_web_theme';
const SIDEBAR_KEY = 'ishrize_sidebar_collapsed';

type ThemeChoice = 'light' | 'dark';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const SCHEDULING_NAV: NavGroup = {
  items: [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/clashes', label: 'Clashes', icon: AlertTriangle },
    { href: '/free-finder', label: 'Free Finder', icon: Search },
    { href: '/ingestion', label: 'Ingestion', icon: Upload },
  ],
};

const MY_TEACHING_NAV: NavGroup = {
  label: 'MY TEACHING',
  items: [
    { href: '/host-dashboard', label: 'Dashboard', icon: GaugeCircle },
    { href: '/my-timetable', label: 'My Timetable', icon: CalendarCheck },
  ],
};

const MANAGE_NAV: NavGroup = {
  label: 'MANAGE',
  items: [
    { href: '/people', label: 'People', icon: Users },
    { href: '/structure', label: 'Structure', icon: Network },
    { href: '/venues', label: 'Venues', icon: MapPin },
    { href: '/activities', label: 'Activities', icon: BookOpen },
    { href: '/groups', label: 'Groups', icon: Layers },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
  ],
};

const ADMIN_NAV: NavGroup = {
  label: 'ADMIN',
  items: [
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/audit', label: 'Audit Log', icon: ScrollText },
  ],
};

function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function NavSection({
  group,
  pathname,
  collapsed,
  onClick,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="space-y-1">
      {group.label && !collapsed && (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          {group.label}
        </p>
      )}
      {group.label && collapsed && <Separator className="mx-2 my-1" />}
      {group.items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={pathname === item.href || pathname.startsWith(item.href + '/')}
          collapsed={collapsed}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

function ThemeButton({ collapsed }: { collapsed: boolean }) {
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    return stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  function toggle() {
    const next: ThemeChoice = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute('data-theme', next === 'dark' ? 'dark' : '');
  }

  const Icon = theme === 'dark' ? Moon : Sun;
  const label = theme === 'dark' ? 'Dark theme' : 'Light theme';

  const btn = (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  });
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isCoordinatorOrAbove = user?.role === 'ADMIN' || user?.role === 'LECTURER';

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  function renderNav(isCollapsed: boolean, onNavigate?: () => void) {
    return (
      <>
        {/* Header */}
        <div className={cn('flex items-center border-b border-border px-3 py-4', isCollapsed && 'justify-center px-2')}>
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">IshRize</span>
          )}
          {isCollapsed && (
            <span className="text-lg font-bold text-foreground">IR</span>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
          <NavSection group={SCHEDULING_NAV} pathname={pathname} collapsed={isCollapsed} onClick={onNavigate} />
          <NavSection group={MY_TEACHING_NAV} pathname={pathname} collapsed={isCollapsed} onClick={onNavigate} />
          {isCoordinatorOrAbove && (
            <NavSection group={MANAGE_NAV} pathname={pathname} collapsed={isCollapsed} onClick={onNavigate} />
          )}
          {isAdmin && (
            <NavSection group={ADMIN_NAV} pathname={pathname} collapsed={isCollapsed} onClick={onNavigate} />
          )}
        </nav>

        {/* Bottom section */}
        <div className="space-y-1 border-t border-border px-2 py-2">
          <NavLink
            item={{ href: '/account/profile', label: 'Account', icon: UserCircle }}
            active={pathname.startsWith('/account')}
            collapsed={isCollapsed}
            onClick={onNavigate}
          />
          <ThemeButton collapsed={isCollapsed} />
          {(() => {
            const logoutBtn = (
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
                  isCollapsed && 'justify-center px-2',
                )}
              >
                <LogOut size={20} className="shrink-0" />
                {!isCollapsed && <span>Sign out</span>}
              </button>
            );
            if (isCollapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{logoutBtn}</TooltipTrigger>
                  <TooltipContent side="right">Sign out</TooltipContent>
                </Tooltip>
              );
            }
            return logoutBtn;
          })()}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-30 md:hidden"
      >
        <Menu size={20} />
      </Button>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card md:flex transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {renderNav(collapsed)}
        <button
          type="button"
          onClick={toggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative flex h-full w-64 flex-col bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-2 top-3 z-10"
            >
              <X size={20} />
            </Button>
            {renderNav(false, () => setMobileOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
