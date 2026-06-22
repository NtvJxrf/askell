import { Manrope } from "next/font/google";
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { StoreProvider } from '@/lib/StoreProvider';
import { Toaster } from '@/components/ui/sonner';
import WS from "../lib/ws.js";
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata = {
  title: "Askell",
  description: "Askell",
};

export default function RootLayout({ children }) {
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
