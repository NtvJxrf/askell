// Generic placeholder shown for calculator forms that aren't built yet.
// Replace individual entries in ./index.js with real form components as they
// get implemented.
export function FormPlaceholder({ title }) {
  return (
    <div className="flex h-full flex-col">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Форма «{title}» в разработке
        </p>
    </div>
  );
}
