'use client';

import { Provider } from 'react-redux';
import { store } from '@/lib/slice';

// Mounts the Redux store for the authenticated app. `store` is a module
// singleton, so any state kept in the slice (calculator form values, etc.)
// survives client-side navigation between pages instead of resetting on every
// route change.
export function StoreProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
