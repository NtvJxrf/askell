// Minimal, reusable button used across the app. Compact by default
// (rounded-md, small padding, 13px) so it never looks bulky.
//
// Variants control the colour treatment:
//   primary   – filled violet (main action)
//   secondary – subtle bordered (default)
//   ghost     – borderless, hover background (toolbar / tabs / icon buttons)
//
// `iconOnly` switches to a square shape for icon-only buttons.
// `active` highlights the button (used by the tab switcher).
// Any extra props (onClick, type, disabled, aria-*, title, …) pass through.

const VARIANT_CLASSES = {
  primary: 'bg-violet-600 text-white hover:bg-violet-700',
  secondary:
    'border border-black/[.12] text-zinc-700 hover:bg-black/[.04] dark:border-white/[.18] dark:text-zinc-300 dark:hover:bg-white/[.06]',
  ghost:
    'text-zinc-600 hover:bg-black/[.04] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-100',
};

const ACTIVE_CLASS = 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300';

export function Button({
  variant = 'secondary',
  iconOnly = false,
  active = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const base =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const shape = iconOnly ? 'size-8' : 'px-3 py-0.5';
  const tone = active ? ACTIVE_CLASS : VARIANT_CLASSES[variant];

  return (
    <button type={type} className={`${base} ${shape} ${tone} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
