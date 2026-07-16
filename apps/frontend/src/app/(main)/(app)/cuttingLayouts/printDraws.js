'use client'
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);

// Папку запоминаем на время сессии (до перезагрузки страницы), чтобы не спрашивать её каждый раз
let cachedRootHandle = null;

const isImageFile = (name) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
};

// Собирает все прямые записи папки за один проход async-итератора
// (сам проход последовательный, но дальнейшая обработка записей идёт параллельно).
async function readEntries(dirHandle) {
  const entries = [];

  for await (const entry of dirHandle.values()) {
    entries.push(entry);
  }

  return entries;
}

async function collectImagesRecursive(dirHandle, path, images) {
  const entries = await readEntries(dirHandle);

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.kind === "file") {
        if (!isImageFile(entry.name)) return;

        const file = await entry.getFile();
        images.push({
          id: `${path}/${entry.name}`,
          name: entry.name,
          file,
          url: URL.createObjectURL(file),
        });
      } else if (entry.kind === "directory") {
        await collectImagesRecursive(entry, `${path}/${entry.name}`, images);
      }
    })
  );
}

// Ищет папки, в названии которых есть номер заказа (подстрока, без учёта регистра),
// рекурсивно по всем вложенным папкам. Внутри найденной папки собирает картинки
// из неё самой и всех её подпапок, дальше вглубь не спускается.
// Соседние папки и уровни вложенности обходятся параллельно (Promise.all), а не
// по одной последовательно — это на порядок ускоряет обход больших деревьев папок.
async function findOrderFolders(dirHandle, orderNumbers, path, groups) {
  const entries = await readEntries(dirHandle);
  const directories = entries.filter((entry) => entry.kind === "directory");

  await Promise.all(
    directories.map(async (entry) => {
      const nameLower = entry.name.toLowerCase();
      const matchedOrder = orderNumbers.find((order) => nameLower.includes(order.toLowerCase()));
      const folderPath = `${path}/${entry.name}`;

      if (matchedOrder) {
        const images = [];
        await collectImagesRecursive(entry, folderPath, images);

        if (images.length > 0) {
          groups.push({ id: folderPath, orderNumber: matchedOrder, folderName: entry.name, images });
        }
      } else {
        await findOrderFolders(entry, orderNumbers, folderPath, groups);
      }
    })
  );
}

const waitForImages = (printWindow) =>
  new Promise((resolve) => {
    const imgs = printWindow.document.images;

    if (imgs.length === 0) {
      resolve();
      return;
    }

    let loaded = 0;

    for (const img of imgs) {
      if (img.complete) {
        loaded++;
        if (loaded === imgs.length) resolve();
      } else {
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded === imgs.length) resolve();
        };
      }
    }
  });

const revokeGroups = (groups) => {
  groups.forEach((group) => group.images.forEach((img) => URL.revokeObjectURL(img.url)));
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

// Большая картинка с зумом (колесо мыши / кнопки) и перетаскиванием, когда увеличено —
// иначе на чертежах с высоким разрешением просто ничего не разглядеть.
function ZoomableImage({ src, alt }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [src]);

  const zoomBy = (factor, center) => {
    setZoom((prev) => {
      const next = clampZoom(prev * factor);

      if (next === prev) return prev;

      if (next <= MIN_ZOOM) {
        setPan({ x: 0, y: 0 });
      } else if (center) {
        // Подтягиваем картинку так, чтобы зум происходил вокруг точки курсора/двойного клика
        const ratio = next / prev;

        setPan((prevPan) => ({
          x: center.x * (1 - ratio) + prevPan.x * ratio,
          y: center.y * (1 - ratio) + prevPan.y * ratio,
        }));
      }

      return next;
    });
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (event) => {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const center = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };

    zoomBy(event.deltaY < 0 ? 1.2 : 1 / 1.2, center);
  };

  const handleDoubleClick = (event) => {
    if (zoom > MIN_ZOOM) {
      resetZoom();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const center = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };

    zoomBy(2.5, center);
  };

  const handlePointerDown = (event) => {
    if (zoom <= MIN_ZOOM) return;

    dragStateRef.current = { startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!dragStateRef.current) return;

    const dx = event.clientX - dragStateRef.current.startX;
    const dy = event.clientY - dragStateRef.current.startY;
    setPan({ x: dragStateRef.current.originX + dx, y: dragStateRef.current.originY + dy });
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
    setDragging(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-1.5">
        <Button variant="outline" size="icon-xs" onClick={() => zoomBy(1 / 1.25)} disabled={zoom <= MIN_ZOOM}>
          <Minus />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon-xs" onClick={() => zoomBy(1.25)} disabled={zoom >= MAX_ZOOM}>
          <Plus />
        </Button>
        <Button variant="outline" size="icon-xs" onClick={resetZoom} disabled={zoom === MIN_ZOOM && pan.x === 0 && pan.y === 0} title="Сбросить зум">
          <RotateCcw />
        </Button>
      </div>

      <div
        className="relative flex h-[75vh] w-[86vw] items-center justify-center overflow-hidden rounded-md bg-muted/30"
        onWheel={handleWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="max-h-full max-w-full touch-none select-none rounded-md object-contain"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: dragging ? "none" : "transform 0.15s ease-out",
            cursor: zoom > MIN_ZOOM ? (dragging ? "grabbing" : "grab") : "zoom-in",
          }}
        />
      </div>
    </div>
  );
}

// Диалог поиска и печати чертежей: ищет в выбранной папке (и подпапках) все папки,
// в названии которых встречается один из переданных номеров заказов, собирает из них
// картинки и позволяет выбрать нужные перед печатью.
export function PrintDrawingsDialog({ open, onOpenChange, orderNumbers = [] }) {
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewImage, setPreviewImage] = useState(null);
  const groupsRef = useRef([]);

  const runSearch = useCallback(async (rootHandle) => {
    setLoading(true);
    setSearched(false);

    try {
      const found = [];
      await findOrderFolders(rootHandle, orderNumbers, "", found);

      revokeGroups(groupsRef.current);
      groupsRef.current = found;
      setGroups(found);
      setSelectedIds(new Set(found.flatMap((group) => group.images.map((img) => img.id))));

      if (found.length === 0) {
        toast.info("Чертежи не найдены");
      }
    } catch (error) {
      console.error(error);
      toast.error("Не удалось выполнить поиск чертежей");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [orderNumbers]);

  useEffect(() => {
    if (!open) {
      // Закрыли окно — сбрасываем результаты предыдущего поиска, чтобы при
      // следующем открытии не мелькали устаревшие найденные чертежи.
      revokeGroups(groupsRef.current);
      groupsRef.current = [];
      setGroups([]);
      setSelectedIds(new Set());
      setSearched(false);
      setLoading(false);
      setPreviewImage(null);
      return;
    }

    if (cachedRootHandle) {
      runSearch(cachedRootHandle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderNumbers]);

  useEffect(() => () => revokeGroups(groupsRef.current), []);

  const handleSelectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      cachedRootHandle = handle;
      await runSearch(handle);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(error);
        toast.error("Не удалось открыть папку");
      }
    }
  };

  const toggleImage = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(groups.flatMap((group) => group.images.map((img) => img.id))));
  const selectNone = () => setSelectedIds(new Set());

  const handlePrint = async () => {
    const selectedImages = groups.flatMap((group) => group.images).filter((img) => selectedIds.has(img.id));

    if (selectedImages.length === 0) {
      toast.error("Выберите хотя бы одну картинку");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("Браузер заблокировал окно печати");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Печать чертежей</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }

            html, body {
              margin: 0;
              padding: 0;
            }

            .page {
              page-break-after: always;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }

            .page:last-child {
              page-break-after: auto;
            }

            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
            }
          </style>
        </head>

        <body>
          ${selectedImages
            .map(
              ({ url }) => `
                <div class="page">
                  <img src="${url}" />
                </div>
              `
            )
            .join("")}
        </body>
      </html>
    `);

    printWindow.document.close();

    await waitForImages(printWindow);

    printWindow.focus();
    printWindow.print();

    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100svh-2rem)] w-[min(1100px,95vw)] max-w-[95vw] flex-col gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Печать чертежей</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectFolder} disabled={loading}>
            {cachedRootHandle ? "Выбрать другую папку" : "Выбрать папку с чертежами"}
          </Button>
          {cachedRootHandle ? (
            <Button variant="outline" size="sm" onClick={() => runSearch(cachedRootHandle)} disabled={loading}>
              Искать заново
            </Button>
          ) : null}
          {groups.length > 0 ? (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Выбрать все
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>
                Снять все
              </Button>
            </>
          ) : null}
          <Badge variant="outline">Заказы: {orderNumbers.join(", ") || "—"}</Badge>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Поиск чертежей...</div>
          ) : null}

          {!loading && searched && groups.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Чертежи не найдены
            </div>
          ) : null}

          {!loading && !searched && !cachedRootHandle ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Выберите папку, чтобы найти чертежи по номерам заказов
            </div>
          ) : null}

          {groups.map((group) => (
            <div key={group.id}>
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-sm font-medium">
                <span>{group.orderNumber}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{group.folderName}</span>
                <Badge variant="outline">{group.images.length} файлов</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.images.map((img) => (
                  <div
                    key={img.id}
                    className="flex flex-col gap-1.5 rounded-md border p-2 hover:border-primary/50"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded bg-muted/30"
                      title="Открыть побольше"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="h-full w-full object-contain" />
                    </button>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <Checkbox checked={selectedIds.has(img.id)} onCheckedChange={() => toggleImage(img.id)} />
                      <span className="truncate text-xs">{img.name}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button size="sm" onClick={handlePrint} disabled={selectedIds.size === 0}>
            Печать ({selectedIds.size})
          </Button>
        </div>
      </DialogContent>

      <Dialog open={Boolean(previewImage)} onOpenChange={(next) => !next && setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] flex-col gap-2">
          {previewImage ? (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{previewImage.name}</DialogTitle>
              </DialogHeader>
              <ZoomableImage src={previewImage.url} alt={previewImage.name} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}