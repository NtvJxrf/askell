// The rest of the app is intentionally locked to a fixed desktop viewport
// (see the root `(main)` layout, which sets `viewport = { width: 1280 }`).
// This route implements a real mobile layout, so it needs mobile browsers
// to report their actual device width instead of being zoomed out to fit
// ~1280px. A `viewport` export in a nested layout/page replaces (rather
// than merges with) the one from an ancestor segment, so this is enough to
// opt this route out of the fixed-width behavior.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function WhatToDoLayout({ children }) {
  return children;
}
