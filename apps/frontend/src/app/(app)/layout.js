import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { hasRole } from '@askell/shared/roles';
import { Sidebar } from '@/components/Sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import Init from '@/lib/init';
// Shell for all authenticated pages: collapsible sidebar + main work area.
// (The /login route lives OUTSIDE this group, so it has no sidebar.)
import { ROLES } from '@askell/shared/roles';

// Sidebar navigation items. `roles` omitted = visible to ANY authenticated user
// (admin always passes, see hasRole). Items are filtered on the SERVER in
// (app)/layout.js, so hidden entries never reach the browser. `icon` is a key
// into ICONS in @/components/icons.
//
// To add a page: create app/(app)/<route>/page.js and add an entry here.
export const NAV_ITEMS = [
  { href: '/calculators', label: 'Калькуляторы', icon: 'calculator' },
  { href: '/production', label: 'Производство', icon: 'factory' },
  { href: '/cuttingLayouts', label: 'Раскрой', icon: 'slice' },
  { href: '/whattodo', label: 'Что брать в работу', icon: 'square-chart-gantt' },
  { href: '/ordersWithStages', label: 'Заказы с этапами', icon: 'logs' },
  { href: '/settings', label: 'Настройки', icon: 'settings' },
  { href: '/reports', label: 'Отчеты', icon: 'file-chart-column' },
  { href: '/admin', label: 'Админка', icon: 'shield', roles: [ROLES.ADMIN] },
];

export default async function AppLayout({ children }) {
  const session = await auth();
  const user = session?.user ?? null;

  // Keep only what the client needs (serializable), and filter nav by role on
  // the server so hidden items never ship to the browser.
  const safeUser = user
    ? { fullname: user.fullname, username: user.username, roles: user.roles ?? [] }
    : null;
  const items = NAV_ITEMS
    .filter((item) => hasRole(user, item.roles))
    .map(({ href, label, icon }) => ({ href, label, icon }));

  // Restore the persisted expanded/collapsed state (set by SidebarProvider).
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen} className="h-svh overflow-hidden">
        <Sidebar user={safeUser} items={items} />
        <SidebarInset className="overflow-y-auto">{children}</SidebarInset>
        <Init />
      </SidebarProvider>
    </TooltipProvider>
  );
}
