'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Separator } from "@/components/ui/separator";
import ItemDialog from "@/app/(main)/(app)/whattodo/itemDialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { QrCode, Search, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import QrScannerDialog from "@/app/(main)/(app)/whattodo/qrScannerDialog";
import { useIsMobile } from "@/hooks/use-mobile";

const RU_TO_EN_KEYBOARD_MAP = {
  ё: "`", Ё: "~", й: "q", Й: "Q", ц: "w", Ц: "W", у: "e", У: "E",
  к: "r", К: "R", е: "t", Е: "T", н: "y", Н: "Y", г: "u", Г: "U",
  ш: "i", Ш: "I", щ: "o", Щ: "O", з: "p", З: "P", х: "[", Х: "{",
  ъ: "]", Ъ: "}", ф: "a", Ф: "A", ы: "s", Ы: "S", в: "d", В: "D",
  а: "f", А: "F", п: "g", П: "G", р: "h", Р: "H", о: "j", О: "J",
  л: "k", Л: "K", д: "l", Д: "L", ж: ";", Ж: ":", э: "'", Э: '"',
  я: "z", Я: "Z", ч: "x", Ч: "X", с: "c", С: "C", м: "v", М: "V",
  и: "b", И: "B", т: "n", Т: "N", ь: "m", Ь: "M", б: ",", Б: "<",
  ю: ".", Ю: ">", ".": "/", ",": "?"
};

const localStorageKey = 'whattodo_visible_keys'
export default function WhatToDoPage() {
  const heapsRaw = useSelector((state) => state.app.heaps)
  const heaps = useMemo(() => {
    if (!heapsRaw) return null;
    const result = {};
    for (const [stage, items] of Object.entries(heapsRaw)) {
      result[stage] = items.filter(item => item.tier < 2);
    }
    return result;
  }, [heapsRaw]);
  const settings = useSelector((state) => state.app.settings);
  const [selectedItem, setSelectedItem] = useState(null);
  const productionRowIdRef = useRef('')
  const isMobile = useIsMobile()
  const [qrOpen, setQrOpen] = useState(false);
  const [filters, setFilters] = useState({
    orderNumber: "",
    productionOrder: "",
    productionRowId: "",
  });
  const [visibleKeys, setVisibleKeys] = useState([])
  useEffect(() => {
    const rawValue = localStorage.getItem(localStorageKey);
    if(rawValue){
      setVisibleKeys(JSON.parse(rawValue))
      return
    }
    if (!heaps) return;

    setVisibleKeys(Object.keys(heaps));
  }, [heaps]);
  const handleSelect = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  const handleDialogChange = useCallback((open) => {
    if (!open) setSelectedItem(null);
  }, []);
  const handleProdFilter = () => {
    const value =  String(productionRowIdRef.current?.value ?? "").split("").map(c => RU_TO_EN_KEYBOARD_MAP[c] ?? c).join("");
    setFilters((prev) => ({
      ...prev,
      productionRowId: extractRowId(value),
    }));
  }
  const handleQrScan = useCallback((decodedText) => {
    const id = extractRowId(decodedText);
    if (productionRowIdRef.current) {
      productionRowIdRef.current.value = decodedText;
    }
    setQrOpen(false);
    setFilters((prev) => ({
      ...prev,
      productionRowId: id,
    }));
  }, []);
  const filteredStageCounts = useMemo(() => {
    const counts = {};

    for (const [stage, items] of Object.entries(heaps || {})) {
      counts[stage] = items.filter(item => {
        if (filters.orderNumber && !item.taskAttrs?.["№ заказа покупателя"]?.includes(filters.orderNumber)) {
          return false;
        }

        if (filters.productionOrder && !item.taskName?.includes(filters.productionOrder)) {
          return false;
        }

        if (filters.productionRowId && !item.productionRowId?.includes(filters.productionRowId)) {
          return false;
        }

        return true;
      }).length;
    }

    return counts;
  }, [heaps, filters]);
  const groupedHeaps = useMemo(() => {
    if (!heaps) return {};
    const result = {};

    for (const [stage, items] of Object.entries(heaps)) {
      const map = new Map();
      if (!visibleKeys.includes(stage)) {
        continue;
      }
      for (const item of items) {
        if (filters.orderNumber && !item.taskAttrs?.["№ заказа покупателя"]?.includes(filters.orderNumber)) continue
        if (filters.productionOrder && !item.taskName?.includes(filters.productionOrder)) continue
        if (filters.productionRowId && !item.productionRowId?.includes(filters.productionRowId)) continue
        const key = item.productionRowId;

        if (!map.has(key)) {
          map.set(key, {
            ...item,
            quantity: 1,
          });
        } else {
          const existing = map.get(key);
          existing.quantity += 1;
        }
      }

      const groupedItems = Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.deliveryPlannedMoment) -
          new Date(b.deliveryPlannedMoment)
      );

      result[stage] = groupedItems;
    }

    return result;
  }, [heaps, filters, visibleKeys]);
  const stageTotals = useMemo(() => {
    const totals = {};
    for (const [stage, items] of Object.entries(groupedHeaps)) {
      totals[stage] = items.reduce((sum, item) => sum + item.quantity, 0);
    }

    return totals;
  }, [groupedHeaps]);
  const overdue = (item) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    today.setDate(
        today.getDate() + (settings?.overdueDays?.value ?? 0)
    );

    const itemDate = new Date(item.deliveryPlannedMoment);

    return itemDate < today;
  };
  return (
    <>
      {isMobile ? (
        <div className="flex gap-2 p-2 border-b items-center">
          <SidebarTrigger className="size-11 shrink-0" />

          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => setQrOpen(true)}
            aria-label="Сканировать QR"
          >
            <QrCode className="size-5" />
          </Button>

          <Input
            className="h-11 flex-1 text-base"
            placeholder="ProductionRowid (qr code)"
            ref={productionRowIdRef}
            onChange={(e) => {
              if (e.currentTarget.value === '') {
                setFilters((prev) => ({
                  ...prev,
                  productionRowId: ''
                }));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleProdFilter()
              }
            }}
          />

          <Button size="icon" className="size-11 shrink-0" onClick={handleProdFilter} aria-label="Найти">
            <Search className="size-5" />
          </Button>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Фильтры" />
              }
            >
              <SlidersHorizontal className="size-5" />
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Фильтры</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 p-4 pt-0">
                <Input
                  className="h-11 text-base"
                  placeholder="Номер заказа"
                  value={filters.orderNumber}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      orderNumber: e.target.value,
                    }))
                  }
                />

                <Input
                  className="h-11 text-base"
                  placeholder="Номер ПЗ"
                  value={filters.productionOrder}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      productionOrder: e.target.value,
                    }))
                  }
                />

                <Separator />

                <div className="text-sm font-semibold uppercase text-muted-foreground">
                  Колонки
                </div>

                <ColumnsFieldGroup
                  heaps={heaps}
                  visibleKeys={visibleKeys}
                  setVisibleKeys={setVisibleKeys}
                  filteredStageCounts={filteredStageCounts}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="flex gap-2 p-2 border-b items-center">
          <Popover>
            <PopoverTrigger className="flex" render={<Button variant="outline">Колонки</Button>} />
            <PopoverContent className="w-[90vw] max-w-none overflow-y-auto">
              <ColumnsFieldGroup
                heaps={heaps}
                visibleKeys={visibleKeys}
                setVisibleKeys={setVisibleKeys}
                filteredStageCounts={filteredStageCounts}
              />
            </PopoverContent>
          </Popover>
          <Input
            className="max-w-[200px]"
            placeholder="Номер заказа"
            value={filters.orderNumber}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                orderNumber: e.target.value,
              }))
            }
          />

          <Input
            className="max-w-[200px]"
            placeholder="Номер ПЗ"
            value={filters.productionOrder}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                productionOrder: e.target.value,
              }))
            }
          />
          <Input
            className="max-w-[200px]"
            placeholder="ProductionRowid (qr code)"
            ref={productionRowIdRef}
            onChange={(e) =>{
              if(e.currentTarget.value === ''){
                setFilters((prev) => ({
                  ...prev,
                  productionRowId: ''
                }));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleProdFilter()
              }
            }}
          />
          <Button onClick={handleProdFilter}>
            Найти
          </Button>
        </div>
      )}
      <div
        className={
          isMobile
            ? "flex flex-col overflow-y-auto overflow-x-hidden text-sm"
            : "flex h-screen overflow-x-auto overflow-y-hidden text-sm"
        }
      >
        {Object.entries(groupedHeaps)
          .filter(([, items]) => !isMobile || items.length > 0)
          .map(([stage, items]) => {
          return (
            <div
              key={stage}
              className={
                isMobile
                  ? "w-full border-b border-border"
                  : "w-60 shrink-0 border-r border-border"
              }
            >
              {/* header */}
              <div
                className={
                  isMobile
                    ? "flex items-center gap-2 border-b bg-background p-2"
                    : "sticky top-0 z-10 flex items-center gap-2 border-b bg-background p-1"
                }
              >
                <h2 className="flex-1 truncate text-sm font-semibold">
                  {stage}
                </h2>

                <div className="text-sm text-muted-foreground">
                  {stageTotals[stage]}
                </div>
              </div>

              {/* items */}
              <div
                className={
                  isMobile
                    ? ""
                    : "overflow-y-auto scrollbar-none max-h-[calc(100vh-56px)] scrollbar-thumb-border"
                }
              >
                {items.map((item, index) => (
                  <div key={item.productionRowId}>
                    <div
                      className={
                        isMobile
                          ? "relative p-4 cursor-pointer active:bg-muted/50"
                          : "relative p-3 cursor-pointer hover:bg-muted/50"
                      }
                      onClick={() => handleSelect(item)}
                    >
                      <div
                        className={
                          isMobile
                            ? "absolute right-4 top-4 text-sm font-semibold"
                            : "absolute right-3 top-3 text-xs font-semibold"
                        }
                      >
                        ×{item.quantity}
                      </div>

                      <div
                        className={
                          isMobile
                            ? "pr-10 text-base font-medium leading-snug line-clamp-2"
                            : "pr-8 text-sm font-medium leading-snug line-clamp-2"
                        }
                        title={item.name}
                      >
                        {item.name}
                      </div>

                      <div className={isMobile ? "mt-2 text-sm" : "mt-2 text-xs"}>
                        Заказ: {item.taskAttrs?.["№ заказа покупателя"]}
                      </div>

                      <div
                        className={`mt-1 ${isMobile ? "text-sm" : "text-xs"} ${
                          overdue(item) ? "text-red-500" : "text-muted-foreground"
                        }`}
                      >
                        { new Date(item.deliveryPlannedMoment).toLocaleDateString()}
                      </div>

                      {item?.attributes?.["Длина в мм"] && (
                        <div className={isMobile ? "mt-1 text-sm text-muted-foreground" : "mt-1 text-xs text-muted-foreground"}>
                          {item.attributes["Длина в мм"]} ×{" "}
                          {item.attributes["Ширина в мм"]}
                        </div>
                      )}
                    </div>

                    {index < items.length - 1 && <Separator />}
                  </div>
                ))}

                <Separator />
              </div>
            </div>
          );
        })}
      </div>
      <ItemDialog
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={handleDialogChange}
      />
      <QrScannerDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        onScan={handleQrScan}
      />
    </>
  );
}

const extractRowId = rawValue => {
  const s = String(rawValue ?? "").trim();
  if (!s) return "";
  const last = s.includes("/") ? s.split("/").filter(Boolean).pop() : s;
  return last?.split("?")[0].split("#")[0].trim() ?? "";
};

function ColumnsFieldGroup({ heaps, visibleKeys, setVisibleKeys, filteredStageCounts }) {
  return (
    <FieldGroup>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => {
          setVisibleKeys(Object.keys(heaps || {}));
          localStorage.setItem(localStorageKey, JSON.stringify(Object.keys(heaps || {})));
        }}>
          Показать все
        </Button>
        <Button variant="outline" onClick={() => {
          setVisibleKeys([]);
          localStorage.setItem(localStorageKey, JSON.stringify([]));
        }}>
          Скрыть все
        </Button>
      </div>
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
        {Object.entries(heaps || {})
          .sort(([keyA, valueA], [keyB, valueB]) => {
            if (valueA?.length !== valueB?.length) {
              return (valueB?.length ?? 0) - (valueA?.length ?? 0);
            }
            return keyA.localeCompare(keyB, 'ru');
          })
          .map(([key]) => (
            <Field
              key={key}
              orientation="horizontal"
              className="flex items-center gap-2 min-w-0 border-r pr-2 last:border-r-0"
            >
              <Checkbox id={`toggle-checkbox-${key}`}
                onCheckedChange={() => {
                  setVisibleKeys((prev) => {
                    const newVisibleKeys = prev.includes(key)
                      ? prev.filter((k) => k !== key)
                      : [...prev, key];
                    localStorage.setItem(localStorageKey, JSON.stringify(newVisibleKeys));
                    return newVisibleKeys;
                  });
                }}
                checked={visibleKeys.includes(key)}
              />

              <Label
                htmlFor={`toggle-checkbox-${key}`}
                className="truncate min-w-0 flex-1"
                title={key}
              >
                {key}
              </Label>

              <span className={`shrink-0 text-xs tabular-nums ${filteredStageCounts[key] > 0 ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                {filteredStageCounts[key]}
              </span>
            </Field>
          ))}
      </div>
    </FieldGroup>
  );
}