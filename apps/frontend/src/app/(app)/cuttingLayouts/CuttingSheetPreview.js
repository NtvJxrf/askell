'use client'
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const PIECE_COLOR_CLASSES = [
  "bg-emerald-200/70 border-emerald-400/70 dark:bg-emerald-900/50 dark:border-emerald-700",
  "bg-amber-200/70 border-amber-400/70 dark:bg-amber-900/50 dark:border-amber-700",
  "bg-sky-200/70 border-sky-400/70 dark:bg-sky-900/50 dark:border-sky-700",
  "bg-violet-200/70 border-violet-400/70 dark:bg-violet-900/50 dark:border-violet-700",
  "bg-rose-200/70 border-rose-400/70 dark:bg-rose-900/50 dark:border-rose-700",
  "bg-teal-200/70 border-teal-400/70 dark:bg-teal-900/50 dark:border-teal-700",
  "bg-yellow-200/70 border-yellow-400/70 dark:bg-yellow-900/50 dark:border-yellow-700",
  "bg-fuchsia-200/70 border-fuchsia-400/70 dark:bg-fuchsia-900/50 dark:border-fuchsia-700",
];

export const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

export const getWasteBadgeClass = (value) => {
  const waste = Number(value || 0);

  if (waste < 20) return "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (waste <= 30) return "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400";

  return "border-transparent bg-red-500/15 text-red-600 dark:text-red-400";
};

export const getPieceTitle = (piece) =>
  `${piece.source?.orderNumber || "Без заказа"} · ${piece.source?.docName || "Без ПЗ"} · ${piece.source?.name || "Деталь"} · ${piece.sourceWidth} x ${piece.sourceHeight} мм`;

// Визуальный превью листа раскроя с расположением деталей. Переиспользуется
// на странице /cuttingLayouts и в панели позиций калькулятора (тултип "Обрезь").
export function CuttingSheetPreview({ layout, label, maxWidth = 220, maxHeight = 150, showPieceLabels = false, interactive = false, onClick, className, fill = false }) {
  const sheetStyle = fill
    ? {
      width: "100%",
      aspectRatio: `${layout.stockWidth} / ${layout.stockHeight}`,
      maxWidth: maxWidth ? `${maxWidth}px` : undefined,
    }
    : (() => {
        const scale = Math.min(maxWidth / layout.stockWidth, maxHeight / layout.stockHeight);

        return {
          width: Math.max(Math.round(layout.stockWidth * scale), 120),
          height: Math.max(Math.round(layout.stockHeight * scale), 80),
        };
      })();

  return (
    <div className={cn("flex flex-col gap-1", fill ? "h-full" : "inline-flex", className)}>
      <div className="flex shrink-0 items-center justify-between gap-1.5 px-1 text-[10px] leading-none">
        <span className="truncate text-muted-foreground">
          {label ? `${label} · ` : ""}
        </span>

        <Badge
          className={cn(
            "h-4 shrink-0 rounded-sm px-1 text-[10px]",
            getWasteBadgeClass(layout.waste)
          )}
        >
          {formatPercent(layout.waste)}
        </Badge>
      </div>

      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? onClick : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={cn(
          "relative overflow-hidden rounded-md border bg-muted/30",
          fill && "h-full w-full",
          interactive &&
            "cursor-pointer transition-colors hover:border-primary/50"
        )}
        style={sheetStyle}
      >
        {layout.pieces.map((piece, index) => {
          const widthPct = (piece.width / layout.stockWidth) * 100;
          const heightPct = (piece.height / layout.stockHeight) * 100;
          const canLabel = showPieceLabels && widthPct >= 8 && heightPct >= 6;

          return (
            <div
              key={`${piece.x}-${piece.y}-${piece.width}-${piece.height}-${index}`}
              title={getPieceTitle(piece)}
              className={cn(
                "absolute flex items-center justify-center overflow-hidden border text-center leading-none",
                PIECE_COLOR_CLASSES[index % PIECE_COLOR_CLASSES.length]
              )}
              style={{
                left: `${(piece.x / layout.stockWidth) * 100}%`,
                top: `${(piece.y / layout.stockHeight) * 100}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
            >
              {canLabel && (
                <span className="px-0.5 text-[9px] text-foreground/80">
                  <span className="block truncate">
                    {piece.source?.orderNumber || "Без заказа"}
                  </span>
                  <span className="block truncate">
                    {piece.source?.docName || "Без ПЗ"}
                  </span>
                  <span className="block truncate">
                    {piece.sourceWidth} × {piece.sourceHeight}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
