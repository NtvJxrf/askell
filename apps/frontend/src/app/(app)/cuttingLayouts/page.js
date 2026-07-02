'use client'
import { useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { backend } from "@/lib/backend";
import { store } from "@/lib/slice";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildCuttingPiecesByMaterial,
  buildDailyCuttingTask,
  buildSourceGroups,
  buildTaskOrderGroups,
  calculateMaterialLayouts,
  groupDailyTaskByMaterial,
} from "./cuttingLayouts";

const ALL_MATERIALS = "__all_materials__";
const DAILY_TASK_STORAGE_KEY = "daily_cutting_task";

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

function CuttingSheetPreview({ layout, label, maxWidth = 220, maxHeight = 150, showPieceLabels = false, interactive = false, onClick, className, fill = false }) {
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

function TaskMaterialSection({ material, data, onRemoveLayout, onRemovePiece }) {
  const orderGroups = useMemo(() => buildTaskOrderGroups(data.layouts), [data.layouts]);
  const totalPieces = data.layouts.reduce((sum, layout) => sum + layout.pieces.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{material}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">Листов: {data.layouts.length}</Badge>
            <Badge variant="outline">Деталей: {totalPieces}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="grid w-full shrink-0 grid-cols-2 content-start gap-2 sm:grid-cols-3 lg:w-[300px] lg:grid-cols-1">
            {data.layouts.map((layout, index) => (
              <div key={layout.id} className="relative">
                <CuttingSheetPreview layout={layout} label={`Лист ${index + 1}`} maxWidth={300} maxHeight={200} />
                <Button
                  variant="destructive"
                  size="icon-xs"
                  className="absolute top-4 right-1"
                  onClick={() => onRemoveLayout(material, layout.id)}
                  title="Удалить лист из задания"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {orderGroups.map((order) => (
              <div key={order.key} className="rounded-md border px-2.5 py-1.5 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{order.orderNumber}</span>
                  <Badge variant="outline">{order.pieces.length} шт.</Badge>
                </div>
                <div className="mb-1.5 text-xs text-muted-foreground">ПЗ: {order.docName}</div>
                <div className="space-y-1">
                  {order.pieces.map((piece) => (
                    <div
                      key={piece.pieceId}
                      className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                    >
                      <span className="truncate">
                        {piece.source?.name || "Деталь"} · {piece.sourceWidth} x {piece.sourceHeight} мм
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0"
                        onClick={() => onRemovePiece(material, piece.layoutId, piece.pieceId)}
                        title="Удалить деталь из задания"
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceGroupRow({ group, onResolved }) {
  const quantityRef = useRef(null);
  const descriptionRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const clampQuantity = (value) => {
    if (Number.isNaN(value) || value < 1) value = 1;
    if (value > group.count) value = group.count;
    return value;
  };

  const handleChange = (e) => {
    if (e.target.value === "") return;
    const value = Number(e.target.value);
    if (Number.isNaN(value)) return;
    if (value > group.count) e.target.value = group.count;
  };

  const handleBlur = (e) => {
    e.target.value = clampQuantity(Number(e.target.value));
  };

  const getQuantity = () => clampQuantity(Number(quantityRef.current?.value ?? 1));

  const handleComplete = async () => {
    const quantity = getQuantity();

    setBusy(true);
    try {
      const user = store.getState().app.user;
      const res = await backend('/productionCompletion/complete', {
        method: 'POST',
        body: {
          quantity,
          description: descriptionRef.current?.value ?? "",
          item: group.source,
          user,
        },
      });

      if (res === true) {
        toast.success("Операция выполнена");
        onResolved(quantity);
      } else {
        toast.error(`Ошибка: ${res}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDefect = async () => {
    if (!descriptionRef.current?.value || descriptionRef.current.value.trim() === "") {
      toast.error("Введите комментарий для брака");
      return;
    }

    const quantity = getQuantity();

    setBusy(true);
    try {
      const user = store.getState().app.user;
      const res = await backend('/productionCompletion/defect', {
        method: 'POST',
        body: {
          quantity,
          description: descriptionRef.current.value,
          item: group.source,
          user,
        },
      });

      if (res === true) {
        toast.success("Брак зафиксирован");
        onResolved(quantity);
      } else {
        toast.error(`Ошибка: ${res}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenPz = () => {
    // TODO: реализовать открытие ПЗ
    toast.info("Открытие ПЗ пока не реализовано");
  };

  return (
    <div className="space-y-1 rounded-md border px-2 py-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="truncate font-medium">{group.source?.name || "Деталь"}</span>
        <Badge variant="outline" className="h-4 shrink-0 rounded-sm px-1 text-[10px]">{group.count} шт.</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {group.source?.orderNumber || "Без заказа"} · {group.source?.docName || "Без ПЗ"} · {group.sourceWidth} x {group.sourceHeight} мм
        </span>

        <Input
          ref={quantityRef}
          type="number"
          min={1}
          max={group.count}
          defaultValue={1}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={busy}
          className="h-8 w-16 shrink-0"
        />
        <Textarea
          ref={descriptionRef}
          placeholder="Комментарий (обязателен для брака)"
          disabled={busy}
          className="h-8 min-h-8 w-40 shrink-0 resize-none py-1.5"
        />
        <Button variant="outline" size="sm" className="shrink-0" onClick={handleOpenPz}>
          Открыть ПЗ
        </Button>
        <Button variant="destructive" size="sm" className="shrink-0" onClick={handleDefect} disabled={busy}>
          Брак
        </Button>
        <Button size="sm" className="shrink-0" onClick={handleComplete} disabled={busy}>
          Выполнить
        </Button>
      </div>
    </div>
  );
}

function SavedTaskLayoutSection({ material, layout, index, onResolveGroup }) {
  const groups = useMemo(() => buildSourceGroups([layout]), [layout]);

  const handlePrintLabels = () => {
    // TODO: реализовать печать этикеток
    toast.info("Печать этикеток пока не реализована");
  };

  const handlePrintDrawings = () => {
    // TODO: реализовать печать чертежей
    toast.info("Печать чертежей пока не реализована");
  };

  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex shrink-0 flex-col gap-1.5">
          <CuttingSheetPreview layout={layout} label={`Лист ${index + 1}`} maxWidth={180} maxHeight={130} />
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1" onClick={handlePrintLabels}>
              Этикетки
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handlePrintDrawings}>
              Чертежи
            </Button>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {groups.map((group) => (
            <SourceGroupRow
              key={group.sourceId}
              group={group}
              onResolved={(quantity) => onResolveGroup(material, group, quantity)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SavedTaskMaterialSection({ material, data, onResolveGroup }) {
  const totalPieces = data.layouts.reduce((sum, layout) => sum + layout.pieces.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{material}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">Листов: {data.layouts.length}</Badge>
            <Badge variant="outline">Деталей: {totalPieces}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {data.layouts.map((layout, index) => (
          <SavedTaskLayoutSection
            key={layout.id}
            material={material}
            layout={layout}
            index={index}
            onResolveGroup={onResolveGroup}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default function CuttingLayoutsPage() {
  const heapsRaw = useSelector((state) => state.app.heaps);
  const selfcost = useSelector((state) => state.app.selfcost);
  console.log(JSON.parse(localStorage.getItem(DAILY_TASK_STORAGE_KEY)))
  const [selectedMaterial, setSelectedMaterial] = useState(ALL_MATERIALS);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [dailyTask, setDailyTask] = useState(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [savedTask, setSavedTask] = useState(null);
  const [savedTaskDialogOpen, setSavedTaskDialogOpen] = useState(false);

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
  const handleCreateTask = () => {
    const task = buildDailyCuttingTask(materials, { maxArea: 150 });

    setDailyTask(groupDailyTaskByMaterial(task));
    setTaskDialogOpen(true);
  };

  const handleRemoveLayout = (materialName, layoutId) => {
    setDailyTask((prev) => {
      if (!prev) return prev;

      const materials = prev.materials
        .map(([name, data]) => {
          if (name !== materialName) return [name, data];

          return [name, { layouts: data.layouts.filter((layout) => layout.id !== layoutId) }];
        })
        .filter(([, data]) => data.layouts.length > 0);

      return { ...prev, materials };
    });
  };

  const handleRemovePiece = (materialName, layoutId, pieceId) => {
    setDailyTask((prev) => {
      if (!prev) return prev;

      const materials = prev.materials
        .map(([name, data]) => {
          if (name !== materialName) return [name, data];

          const layouts = data.layouts
            .map((layout) => {
              if (layout.id !== layoutId) return layout;

              return { ...layout, pieces: layout.pieces.filter((piece) => piece.pieceId !== pieceId) };
            })
            .filter((layout) => layout.pieces.length > 0);

          return [name, { layouts }];
        })
        .filter(([, data]) => data.layouts.length > 0);

      return { ...prev, materials };
    });
  };

  const handleSaveTask = () => {
    if (!dailyTask) return;

    localStorage.setItem(DAILY_TASK_STORAGE_KEY, JSON.stringify(dailyTask));
    toast.success("Задание сохранено");
    setTaskDialogOpen(false);
  };

  const taskTotals = useMemo(() => {
    if (!dailyTask) return { totalLayouts: 0, totalPieces: 0, totalArea: 0 };

    return dailyTask.materials.reduce(
      (acc, [, data]) => {
        data.layouts.forEach((layout) => {
          acc.totalLayouts += 1;
          acc.totalPieces += layout.pieces.length;
          acc.totalArea += (layout.stockWidth * layout.stockHeight) / 1_000_000;
        });

        return acc;
      },
      { totalLayouts: 0, totalPieces: 0, totalArea: 0 }
    );
  }, [dailyTask]);

  const handleShowTask = () => {
    const raw = localStorage.getItem(DAILY_TASK_STORAGE_KEY);

    if (!raw) {
      toast.error("Нет сохранённого задания");
      return;
    }

    try {
      setSavedTask(JSON.parse(raw));
      setSavedTaskDialogOpen(true);
    } catch {
      toast.error("Не удалось прочитать сохранённое задание");
    }
  };

  const handleResolveGroup = (materialName, group, quantity) => {
    setSavedTask((prev) => {
      if (!prev) return prev;

      let remaining = quantity;
      const pieceIdsToRemove = new Set();

      for (const piece of group.pieces) {
        if (remaining <= 0) break;
        pieceIdsToRemove.add(`${piece.layoutId}::${piece.pieceId}`);
        remaining -= 1;
      }

      const materials = prev.materials
        .map(([name, data]) => {
          if (name !== materialName) return [name, data];

          const layouts = data.layouts
            .map((layout) => ({
              ...layout,
              pieces: layout.pieces.filter((piece) => !pieceIdsToRemove.has(`${layout.id}::${piece.pieceId}`)),
            }))
            .filter((layout) => layout.pieces.length > 0);

          return [name, { layouts }];
        })
        .filter(([, data]) => data.layouts.length > 0);

      const updated = { ...prev, materials };
      localStorage.setItem(DAILY_TASK_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const savedTaskTotals = useMemo(() => {
    if (!savedTask) return { totalLayouts: 0, totalPieces: 0, totalArea: 0 };

    return savedTask.materials.reduce(
      (acc, [, data]) => {
        data.layouts.forEach((layout) => {
          acc.totalLayouts += 1;
          acc.totalPieces += layout.pieces.length;
          acc.totalArea += (layout.stockWidth * layout.stockHeight) / 1_000_000;
        });

        return acc;
      },
      { totalLayouts: 0, totalPieces: 0, totalArea: 0 }
    );
  }, [savedTask]);
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
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleCreateTask}>
            Собрать задание на сегодня
        </Button>
        <Button variant="outline" size="sm" onClick={handleShowTask}>
            Показать задание
        </Button>
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
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
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
                <div className="flex flex-wrap gap-1 overflow-y-auto">
                  {data.layouts.map((layout, index) => (
                    <div key={layout.id}>
                      <CuttingSheetPreview
                        layout={layout}
                        label={`Лист ${index + 1}`}
                        maxWidth={250}
                        maxHeight={150}
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
        <DialogContent className="w-fit max-w-[95vw] flex-col gap-4">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.material} · лист {selected.layoutIndex + 1}</DialogTitle>
              </DialogHeader>
              <div className="flex h-[min(640px,65vh)] min-h-0 gap-4">
                
                <div className="flex-1 min-w-0 flex">
                  <CuttingSheetPreview
                    layout={selected.layout}
                    fill
                    maxWidth={760}
                    showPieceLabels
                    className="w-full ring-1 ring-primary/30"
                  />
                </div>

                <div className="flex h-full w-[300px] shrink-0 flex-col gap-4 overflow-y-auto pr-1">
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

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="flex h-[calc(100svh-2rem)] w-[min(1160px,95vw)] max-w-[95vw] flex-col gap-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Задание на раскрой</DialogTitle>
          </DialogHeader>
          {dailyTask ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">Материалов: {dailyTask.materials.length}</Badge>
                <Badge variant="outline">Листов: {taskTotals.totalLayouts}</Badge>
                <Badge variant="outline">Деталей: {taskTotals.totalPieces}</Badge>
                <Badge variant="outline">Площадь: {taskTotals.totalArea.toFixed(2)} м²</Badge>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {dailyTask.materials.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                    Задание пусто
                  </div>
                ) : (
                  dailyTask.materials.map(([name, data]) => (
                    <TaskMaterialSection
                      key={name}
                      material={name}
                      data={data}
                      onRemoveLayout={handleRemoveLayout}
                      onRemovePiece={handleRemovePiece}
                    />
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setTaskDialogOpen(false)}>
                  Закрыть
                </Button>
                <Button size="sm" onClick={handleSaveTask} disabled={dailyTask.materials.length === 0}>
                  Сохранить задание
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={savedTaskDialogOpen} onOpenChange={setSavedTaskDialogOpen}>
        <DialogContent className="flex h-[calc(100svh-2rem)] w-[min(1160px,95vw)] max-w-[95vw] flex-col gap-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Текущее задание на раскрой</DialogTitle>
          </DialogHeader>
          {savedTask ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">Материалов: {savedTask.materials.length}</Badge>
                <Badge variant="outline">Листов: {savedTaskTotals.totalLayouts}</Badge>
                <Badge variant="outline">Деталей: {savedTaskTotals.totalPieces}</Badge>
                <Badge variant="outline">Площадь: {savedTaskTotals.totalArea.toFixed(2)} м²</Badge>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {savedTask.materials.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                    Задание пусто
                  </div>
                ) : (
                  savedTask.materials.map(([name, data]) => (
                    <SavedTaskMaterialSection
                      key={name}
                      material={name}
                      data={data}
                      onResolveGroup={handleResolveGroup}
                    />
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSavedTaskDialogOpen(false)}>
                  Закрыть
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}