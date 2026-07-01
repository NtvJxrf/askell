'use client'
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCuttingPiecesByMaterial, calculateMaterialLayouts } from "./cuttingLayouts";

const ALL_MATERIALS = "__all_materials__";

const PIECE_COLOR_CLASSES = [
  "bg-emerald-200/70 border-emerald-400/70 dark:bg-emerald-900/50 dark:border-emerald-700",
  "bg-amber-200/70 border-amber-400/70 dark:bg-amber-900/50 dark:border-amber-700",
  "bg-sky-200/70 border-sky-400/70 dark:bg-sky-900/50 dark:border-sky-700",
  "bg-violet-200/70 border-violet-400/70 dark:bg-violet-900/50 dark:border-violet-700",
  "bg-rose-200/70 border-rose-400/70 dark:bg-rose-900/50 dark:border-rose-700",
  "bg-teal-200/70 border-teal-400/70 dark:bg-teal-900/50 dark:border-teal-700",
  "bg-yellow-200/70 border-yellow-400/70 dark:bg-yellow-900/50 dark:border-yellow-700",
  "bg-fuchsia-200/70 border-fuchsia-400/70 dark:bg-fuchsia-900/50 dark:border-fuchsia-700",
];

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const getWasteBadgeClass = (value) => {
  const waste = Number(value || 0);

  if (waste < 20) return "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (waste <= 30) return "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400";

  return "border-transparent bg-red-500/15 text-red-600 dark:text-red-400";
};

const getPieceTitle = (piece) =>
  `${piece.source?.orderNumber || "Без заказа"} · ${piece.source?.docName || "Без ПЗ"} · ${piece.source?.name || "Деталь"} · ${piece.sourceWidth} x ${piece.sourceHeight} мм`;

function CuttingSheetPreview({ layout, label, maxWidth = 220, maxHeight = 150, showPieceLabels = false, interactive = false, onClick, className }) {
  const scale = Math.min(maxWidth / layout.stockWidth, maxHeight / layout.stockHeight);
  const width = Math.max(Math.round(layout.stockWidth * scale), 120);
  const height = Math.max(Math.round(layout.stockHeight * scale), 80);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
      className={cn(
        "relative overflow-hidden rounded-md border bg-muted/30",
        interactive && "cursor-pointer transition-colors hover:border-primary/50",
        className
      )}
      style={{ width, height }}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-1.5 bg-background/85 px-1.5 py-0.5 text-[10px] leading-none backdrop-blur-sm">
        <span className="truncate text-muted-foreground">{label ? `${label} · ` : ""}{layout.stockWidth} x {layout.stockHeight} мм</span>
        <Badge className={cn("h-4 shrink-0 rounded-sm px-1 text-[10px]", getWasteBadgeClass(layout.waste))}>{formatPercent(layout.waste)}</Badge>
      </div>
      {layout.pieces.map((piece, index) => {
        const pieceWidth = Math.max(piece.width * scale, 4);
        const pieceHeight = Math.max(piece.height * scale, 4);
        const canLabel = showPieceLabels && pieceWidth >= 44 && pieceHeight >= 20;

        return (
          <div
            key={`${piece.x}-${piece.y}-${piece.width}-${piece.height}-${index}`}
            title={getPieceTitle(piece)}
            className={cn(
              "absolute flex items-center justify-center overflow-hidden border text-center leading-none",
              PIECE_COLOR_CLASSES[index % PIECE_COLOR_CLASSES.length]
            )}
            style={{ left: piece.x * scale, top: piece.y * scale, width: pieceWidth, height: pieceHeight }}
          >
            {canLabel ? (
              <span className="px-0.5 text-[9px] text-foreground/80">
                <span className="block truncate">{piece.source?.orderNumber || "Без заказа"}</span>
                <span className="block truncate">{piece.source?.docName || "Без ПЗ"}</span>
                <span className="block truncate">{piece.sourceWidth} x {piece.sourceHeight}</span>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function CuttingLayoutsPage() {
  const heapsRaw = useSelector((state) => state.app.heaps);
  const selfcost = useSelector((state) => state.app.selfcost);

  const [selectedMaterial, setSelectedMaterial] = useState(ALL_MATERIALS);
  const [selectedLayout, setSelectedLayout] = useState(null);

  const cuttingHeap = useMemo(
    () => (heapsRaw?.["Раскрой"] || []).filter((item) => item?.tier === 1),
    [heapsRaw]
  );

  const { skipped, materials, options, errors, materialNames } = useMemo(() => {
    const { piecesByMaterial, skipped } = buildCuttingPiecesByMaterial(cuttingHeap);
    const { materialLayouts, errors } = calculateMaterialLayouts(piecesByMaterial, selfcost?.materials || {});
    const materials = Object.entries(materialLayouts).sort((a, b) => a[0].localeCompare(b[0], "ru"));
    const materialNames = new Set([...Object.keys(materialLayouts), ...Object.keys(errors)]);

    const options = [
      { label: "Все материалы", value: ALL_MATERIALS },
      ...Array.from(materialNames).sort((a, b) => a.localeCompare(b, "ru")).map((name) => {
        const data = materialLayouts[name];

        return {
          value: name,
          label: data ? `${name} (${data.pieces.length} шт., ${formatPercent(data.summary.averageWaste)})` : name,
        };
      }),
    ];

    return { skipped, materials, options, errors, materialNames };
  }, [cuttingHeap, selfcost]);
  console.log(materials, options)
  const material = selectedMaterial === ALL_MATERIALS || materialNames.has(selectedMaterial) ? selectedMaterial : ALL_MATERIALS;
  const visibleMaterials = material === ALL_MATERIALS ? materials : materials.filter(([name]) => name === material);
  const visibleErrors = Object.entries(errors).filter(([name]) => material === ALL_MATERIALS || name === material);

  const layoutIds = useMemo(
    () => new Set(visibleMaterials.flatMap(([, data]) => data.layouts.map((layout) => layout.id))),
    [visibleMaterials]
  );
  const selected = selectedLayout && layoutIds.has(selectedLayout.layout.id) ? selectedLayout : null;

  const totalLayouts = visibleMaterials.reduce((sum, [, data]) => sum + data.summary.totalPanelsUsed, 0);

  const orderGroups = useMemo(() => {
    if (!selected) return [];

    const grouped = new Map();

    selected.layout.pieces.forEach((piece) => {
      const orderNumber = piece.source?.orderNumber || "Без заказа";
      const docName = piece.source?.docName || "Без ПЗ";
      const key = `${orderNumber}::${docName}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.count += 1;
        return;
      }

      grouped.set(key, { key, orderNumber, docName, count: 1 });
    });

    return Array.from(grouped.values()).sort((a, b) => b.count - a.count || a.orderNumber.localeCompare(b.orderNumber, "ru"));
  }, [selected]);

  if (!heapsRaw || !selfcost || Object.keys(selfcost).length === 0) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Раскрой</h1>
          <Badge variant="secondary">Всего деталей: {cuttingHeap.length}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Раскладки раскроя по материалам</p>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-[320px]">
        <span className="text-xs text-muted-foreground">Материал</span>
        <Select items={options} value={material} onValueChange={setSelectedMaterial}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-[min(90vw,420px)]">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
        <Card size="sm">
          <CardContent>
            <div className="text-xs text-muted-foreground">Материалов</div>
            <div className="text-xl font-semibold">{visibleMaterials.length}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-xs text-muted-foreground">Раскладок</div>
            <div className="text-xl font-semibold">{totalLayouts}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-xs text-muted-foreground">Использовано листов</div>
            <div className="text-xl font-semibold">{totalLayouts}</div>
          </CardContent>
        </Card>
      </div>

      {skipped.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          Пропущено {skipped.length} деталей без материала или размеров. Для расчёта раскладки нужны Материал 1, Ширина в мм и Длина в мм.
        </div>
      ) : null}

      {visibleErrors.length > 0 ? (
        <div className="space-y-2">
          {visibleErrors.map(([name, messages]) => (
            <div key={name} className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              <span className="font-medium">Не удалось построить раскладку: {name}.</span> {messages.join("; ")}
            </div>
          ))}
        </div>
      ) : null}

      {visibleMaterials.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {material === ALL_MATERIALS ? "Нет раскладок для отображения" : `Для материала ${material} нет раскладок`}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibleMaterials.map(([name, data]) => (
            <Card key={name}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>Лист: {data.sheet.width} x {data.sheet.height} мм</CardDescription>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge variant="outline">Деталей: {data.summary.totalPieces}</Badge>
                    <Badge variant="outline">Листов: {data.summary.totalPanelsUsed}</Badge>
                    <Badge className={getWasteBadgeClass(data.summary.averageWaste)}>
                      Обрезь: {formatPercent(data.summary.averageWaste)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex max-h-[420px] flex-wrap gap-4 overflow-y-auto pr-1">
                  {data.layouts.map((layout, index) => (
                    <div key={layout.id} className="w-[200px] space-y-1.5">
                      <CuttingSheetPreview
                        layout={layout}
                        label={`Лист ${index + 1}`}
                        maxWidth={200}
                        maxHeight={140}
                        interactive
                        onClick={() => setSelectedLayout({ material: name, layout, layoutIndex: index })}
                      />
                      <div className="text-xs text-muted-foreground">{layout.pieces.length} деталей на листе</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedLayout(null)}>
        <DialogContent className="max-w-5xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.material} · лист {selected.layoutIndex + 1}</DialogTitle>
              </DialogHeader>
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 md:grid-cols-[1fr_300px]">
                <CuttingSheetPreview
                  layout={selected.layout}
                  maxWidth={620}
                  maxHeight={420}
                  showPieceLabels
                  className="ring-1 ring-primary/30"
                />

                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 text-sm font-medium">Заказы на этом листе</div>
                    <div className="space-y-1.5">
                      {orderGroups.map((order) => (
                        <div key={order.key} className="rounded-md border px-2.5 py-1.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{order.orderNumber}</span>
                            <Badge variant="outline">{order.count} шт.</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">ПЗ: {order.docName}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-sm font-medium">Детали раскладки</div>
                    <div className="space-y-1.5">
                      {selected.layout.pieces.map((piece, index) => (
                        <div key={piece.pieceId || `${piece.x}-${piece.y}-${index}`} className="rounded-md border px-2.5 py-1.5 text-xs">
                          <div className="font-medium">{piece.source?.name || "Деталь"}</div>
                          <div className="mt-0.5 flex flex-col gap-0.5 text-muted-foreground">
                            <span>Заказ: {piece.source?.orderNumber || "Без заказа"}</span>
                            <span>ПЗ: {piece.source?.docName || "Без ПЗ"}</span>
                            <span>Размер: {piece.sourceWidth} x {piece.sourceHeight} мм</span>
                            <span>
                              Дата готовности: {piece.source?.deliveryPlannedMoment
                                ? new Date(piece.source.deliveryPlannedMoment).toLocaleDateString("ru-RU")
                                : "Без даты"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}