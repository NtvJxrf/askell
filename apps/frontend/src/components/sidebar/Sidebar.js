'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ICONS, UserIcon } from '@/components/icons';
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
// Receives an already role-filtered `items` list and a plain `user` object
// from the server layout. Collapse/expand state is owned by SidebarProvider
// (see (app)/layout.js) and persisted via cookie.
export function Sidebar({ user, items }) {
  const pathname = usePathname();

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
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-500 text-[11px] font-bold text-white">
              A
            </span>
            <span className="truncate text-sm font-semibold tracking-tight">ASKELL</span>
          </Link>
          <SidebarTrigger className="ml-auto" />
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = ICONS[item.icon] ?? UserIcon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
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
        <div className="flex justify-end px-1 group-data-[collapsible=icon]:justify-center">
          <ThemeToggle />
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={user?.fullname ?? 'Профиль'}
              render={<Link href="/profile" />}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
                <UserIcon className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate font-medium">{user?.fullname ?? 'Профиль'}</span>
                {user?.username && (
                  <span className="truncate text-[11px] text-sidebar-foreground/60">
                    {user.username}
                  </span>
                )}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
