// Static restrictions/limitations text shown when the "Ограничения" tab is
// active. Fill in the real content as the rules are defined.
export function LimitationsForm() {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Ограничения
      </h2>
      <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p>Здесь будет текст с ограничениями.</p>
      </div>
    </div>
  );
}
