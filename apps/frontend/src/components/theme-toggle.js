'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@/components/icons';

const emptySubscribe = () => () => {};

// False during SSR and the first client render, true afterwards. Avoids a
// hydration mismatch because the resolved theme is only known on the client.
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Light/dark toggle.
export function ThemeToggle({ className = '' }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Переключить тему"
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      className={`grid size-8 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-black/[.04] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-100 ${className}`}
    >
      {hydrated ? (
        isDark ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />
      ) : (
        <span className="size-[18px]" />
      )}
    </button>
  );
}
