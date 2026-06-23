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
