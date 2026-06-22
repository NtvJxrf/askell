'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

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
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Переключить тему"
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      className={className}
    >
      {hydrated ? (
        isDark ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />
      ) : (
        <span className="size-[18px]" />
      )}
    </Button>
  );
}
