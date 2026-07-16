import { Manrope } from "next/font/google";
import '../globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { StoreProvider } from '@/lib/StoreProvider';
import { Toaster } from '@/components/ui/sonner';
import WS from "@/lib/ws.js";
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

// The app has no mobile layout — force browsers (including phones/tablets)
// to lay out the page at a fixed desktop width instead of `device-width`.
// This stops content from squeezing to fit narrow screens; instead the
// browser zooms out and the user can pinch-zoom / scroll horizontally,
// exactly like a non-responsive desktop site.
export const viewport = {
  width: 1280,
  initialScale: 1,
};

export default function MainLayout({ children }) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StoreProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <WS />
            {children}
            <Toaster
              position="top-center"
              closeButton
              duration={5000}
            />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
