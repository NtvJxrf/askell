// Thin separator with a "spotlight" look: brighter and a touch wider in the
// middle, fading and narrowing toward the ends. Defaults to vertical; pass
// `orientation="horizontal"` for a horizontal rule.
//
// The fade is done with a gradient that goes transparent -> color -> transparent
// along the line's length. The mask narrows the line at its ends.
export function Divider({ orientation = 'vertical', className = '' }) {
  const vertical = orientation === 'vertical';

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`shrink-0 ${
        vertical
          ? 'h-full w-px bg-gradient-to-b'
          : 'h-px w-full bg-gradient-to-r'
      } from-transparent via-black/25 to-transparent dark:via-white/30 ${className}`}
      style={{
        maskImage: `linear-gradient(to ${
          vertical ? 'bottom' : 'right'
        }, transparent, black 25%, black 75%, transparent)`,
        WebkitMaskImage: `linear-gradient(to ${
          vertical ? 'bottom' : 'right'
        }, transparent, black 25%, black 75%, transparent)`,
      }}
    />
  );
}
