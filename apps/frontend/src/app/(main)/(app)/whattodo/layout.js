// The root layout ((main)/layout.js) locks the whole app to a fixed
// desktop viewport (width: 1280) — by design, since the app has no mobile
// layout. This page is the one exception: it has a real mobile UI, so it
// needs the browser to use the actual device width instead of the fixed
// 1280px canvas (otherwise phones just render the desktop layout zoomed
// out, and no responsive CSS/JS in the page can compensate for that).
//
// Next.js resolves `viewport` per route segment — the segment closest to
// the page overrides parents — so this scopes the override to /whattodo
// only, leaving every other route on the fixed desktop viewport.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function WhatToDoLayout({ children }) {
  return children;
}
