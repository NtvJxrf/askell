import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { Sidebar } from '@/components/Sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import Init from '@/lib/init';

export default async function AppLayout({ children }) {
  const session = await auth();
  const user = session?.user ?? null;

  // Keep only what the client needs (serializable), and filter nav by
  // permission on the server so hidden items never ship to the browser.
  const safeUser = user
    ? { fullname: user.fullname, username: user.username, roles: user.roles ?? [] }
    : null;

  // Restore the persisted expanded/collapsed state (set by SidebarProvider).
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen} className="h-svh overflow-hidden">
        <Sidebar user={safeUser} />
        <SidebarInset className="overflow-y-auto">{children}</SidebarInset>
        <Init />
      </SidebarProvider>
    </TooltipProvider>
  );
}
