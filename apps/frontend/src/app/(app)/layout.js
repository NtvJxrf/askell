import { auth } from '@/auth';
import { hasRole } from '@askell/shared/roles';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { NAV_ITEMS } from '@/components/sidebar/nav-config';
import { StoreProvider } from '@/lib/StoreProvider';

// Shell for all authenticated pages: collapsible sidebar + main work area.
// (The /login route lives OUTSIDE this group, so it has no sidebar.)
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

  return (
    <div className="flex h-dvh overflow-hidden">
      <StoreProvider>
        <Sidebar user={safeUser} items={items} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </StoreProvider>
    </div>
  );
}
