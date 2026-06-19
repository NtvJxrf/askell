import { ROLES } from '@askell/shared/roles';

// Sidebar navigation items. `roles` omitted = visible to ANY authenticated user
// (admin always passes, see hasRole). Items are filtered on the SERVER in
// (app)/layout.js, so hidden entries never reach the browser. `icon` is a key
// into ICONS in @/components/icons.
//
// To add a page: create app/(app)/<route>/page.js and add an entry here.
export const NAV_ITEMS = [
  { href: '/calculators', label: 'Калькуляторы', icon: 'calculator' },
  { href: '/instructions', label: 'Инструкция', icon: 'book' },
  { href: '/contacts', label: 'Контакты', icon: 'contact' },
  { href: '/admin', label: 'Админка', icon: 'shield', roles: [ROLES.ADMIN] },
];
