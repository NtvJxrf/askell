'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ICONS, UserIcon, PanelLeftIcon } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/Button';

const STORAGE_KEY = 'sidebar:collapsed';
const COLLAPSE_EVENT = 'sidebar:collapsed-change';

// Persisted collapse state modelled as an external store, so we can read
// localStorage without a setState-in-effect (hydration-safe via useSyncExternalStore).
function subscribeCollapsed(callback) {
  window.addEventListener(COLLAPSE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}
function getCollapsedSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}
function getCollapsedServerSnapshot() {
  return false; // expanded during SSR + first client render
}
function setCollapsedStored(next) {
  localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

// Collapsible left navigation. Receives an already role-filtered `items` list
// and a plain `user` object from the server layout.
export function Sidebar({ user, items }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-black/[.08] bg-white transition-[width] duration-200 dark:border-white/[.1] dark:bg-zinc-950 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Top: collapse button + logo slot + company name */}
      <div className="flex h-14 items-center gap-1.5 border-b border-black/[.06] px-2 dark:border-white/[.06]">
        <Button
          variant="ghost"
          iconOnly
          onClick={() => setCollapsedStored(!collapsed)}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          <PanelLeftIcon className="size-[18px]" />
        </Button>

        {!collapsed && (
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {/* LOGO SLOT — replace this <span> with your <Image>/<svg>. */}
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-500 text-[11px] font-bold text-white">
              A
            </span>
            <span className="truncate text-sm font-semibold tracking-tight">ASKELL</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? UserIcon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                  : 'text-zinc-600 hover:bg-black/[.04] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-100'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: theme toggle + user/profile button */}
      <div className="space-y-0.5 border-t border-black/[.06] p-2 dark:border-white/[.06]">
        <div className={`flex ${collapsed ? 'justify-center' : 'justify-end px-1'}`}>
          <ThemeToggle />
        </div>

        <Link
          href="/profile"
          title={collapsed ? user?.fullname ?? 'Профиль' : undefined}
          className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06] ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <UserIcon className="size-[18px]" />
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col text-left">
              <span className="truncate font-medium">{user?.fullname ?? 'Профиль'}</span>
              {user?.username && (
                <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {user.username}
                </span>
              )}
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}
