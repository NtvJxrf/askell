import { Manrope } from "next/font/google";
import '../globals.css';

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata = {
  title: "Calculator",
  description: "Calculator",
  icons: {
    icon: [{ url: '/favicon.png?v=2', type: 'image/png' }],
    shortcut: [{ url: '/favicon.png?v=2', type: 'image/png' }],
    apple: [{ url: '/favicon.png?v=2', type: 'image/png' }],
  },
};

// Separate root layout for public widget pages (e.g. embedded in an iframe
// on an external site). Deliberately WITHOUT the app chrome from
// app/(main)/layout.js — no StoreProvider (redux), no WS (websocket), no
// Toaster, no ThemeProvider. Add any of those back here if a widget needs
// them, but keep this layout minimal by default.
export default function WidgetsLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
