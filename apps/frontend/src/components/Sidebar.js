'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from "next/image";
import { hasPermission } from '@askell/shared/permissions';
import {
  Calculator,
  Factory,
  Slice,
  SquareChartGantt,
  Logs,
  Settings,
  FileChartColumn,
  ShieldCheck,
  User
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

// Collapsible left navigation built on shadcn/ui's Sidebar primitives.
// Receives an already permission-filtered `items` list and a plain `user`
// object from the server layout. Collapse/expand state is owned by
// SidebarProvider (see (app)/layout.js) and persisted via cookie.
export const NAV_ITEMS = [
  { href: '/calculators', label: 'Калькуляторы', icon: Calculator },
  { href: '/production', label: 'Производство', icon: Factory },
  { href: '/cuttingLayouts', label: 'Раскрой', icon: Slice },
  { href: '/whattodo', label: 'Что брать в работу', icon: SquareChartGantt },
  { href: '/ordersWithStages', label: 'Заказы с этапами', icon: Logs },
  { href: '/settings', label: 'Настройки', icon: Settings },
  { href: '/reports', label: 'Отчеты', icon: FileChartColumn },
  { href: '/admin', label: 'Админка', icon: ShieldCheck, permissions: ['Админ'] },
];
export function Sidebar({ user }) {
  const pathname = usePathname();
  const items = NAV_ITEMS
    .filter((item) => hasPermission(user, item.permissions))
    .map(({ href, label, icon }) => ({ href, label, icon }));
  return (
    <SidebarRoot collapsible="icon">
      {/* Top: logo slot + company name + collapse trigger */}
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden"
          >
            {/* LOGO SLOT — replace this <span> with your <Image>/<svg>. */}
            <Image
              src="/logo.svg" // public/logo.svg
              alt="ASKELL"
              width={28}
              height={28}
              className="shrink-0 rounded-md"
              priority
            />
            <span className="truncate text-sm font-semibold tracking-tight">ASKELL</span>
          </Link>
          <SidebarTrigger className="ml-auto" />
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => {
                const Icon = item.icon ?? User;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                      className={`hover:bg-transparent ${active ? 'underline underline-offset-4' : ''}`}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: theme toggle + user/profile button */}
      <SidebarFooter>
        <div className="flex items-center justify-between">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={user?.fullname ?? 'Профиль'}
                render={<Link href="/profile" />}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
                  <User className="size-[18px]" />
                </span>

                <span className="flex min-w-0 flex-col text-left">
                  <span className="truncate font-medium">
                    {user?.fullname ?? 'Профиль'}
                  </span>

                  {user?.username && (
                    <span className="truncate text-[11px] text-sidebar-foreground/60">
                      {user.username}
                    </span>
                  )}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <ThemeToggle />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
