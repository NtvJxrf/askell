'use client';

// Thin wrapper around next-themes so the provider can live in the (server)
// root layout. Toggles a `.dark` class on <html>, which our Tailwind v4
// `@custom-variant dark` and CSS variables react to.
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
