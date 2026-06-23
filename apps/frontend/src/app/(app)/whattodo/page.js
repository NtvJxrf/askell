'use client';

import { useMemo, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Separator } from "@/components/ui/separator";
import ItemDialog from "@/components/itemDialog";

export default function WhatToDoPage() {
  const heaps = useSelector((state) => state.app.heaps);
  const settings = useSelector((state) => state.app.settings);
  const [selectedItem, setSelectedItem] = useState(null);
  const handleSelect = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  const handleDialogChange = useCallback((open) => {
    if (!open) setSelectedItem(null);
  }, []);
  const groupedHeaps = useMemo(() => {
    if (!heaps) return {};
    const result = {};

    for (const [stage, items] of Object.entries(heaps)) {
      const map = new Map();

      for (const item of items) {
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
  }, [heaps]);
  const stageTotals = useMemo(() => {
    const totals = {};
    for (const [stage, items] of Object.entries(groupedHeaps)) {
      totals[stage] = items.reduce((sum, item) => sum + item.quantity, 0);
    }

    return totals;
  }, [groupedHeaps]);
  const overdue = (item) => {
    const today = new Date().setHours(23, 59, 59, 999);
    const itemDate = new Date(item.deliveryPlannedMoment);
    const deliveryDate = itemDate.setDate(itemDate.getDate() + (settings?.overdueDays ?? 0));
    return deliveryDate < today;
  }
  return (
    <>
      <div className="flex h-screen overflow-x-auto overflow-y-hidden text-sm">
        {Object.entries(groupedHeaps).map(([stage, items]) => {
          return (
            <div key={stage} className="w-60 shrink-0 border-r border-border">
              {/* header */}
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background p-3">
                <h2 className="flex-1 truncate text-sm font-semibold">
                  {stage}
                </h2>

                <div className="text-sm text-muted-foreground">
                  {stageTotals[stage]}
                </div>
              </div>

              {/* items */}
              <div className="overflow-y-auto max-h-[calc(100vh-56px)] scrollbar-thin scrollbar-thumb-border">
                {items.map((item, index) => (
                  <div key={item.productionRowId}>
                    <div
                      className="relative p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelect(item)}
                    >
                      <div className="absolute right-3 top-3 text-xs font-semibold">
                        ×{item.quantity}
                      </div>

                      <div
                        className="pr-8 text-sm font-medium leading-snug line-clamp-2"
                        title={item.name}
                      >
                        {item.name}
                      </div>

                      <div className="mt-2 text-xs">
                        Заказ: {item.taskAttrs?.["№ заказа покупателя"]}
                      </div>

                      <div
                        className={`mt-1 text-xs ${
                          overdue(item) ? "text-red-500" : "text-muted-foreground"
                        }`}
                      >
                        { new Date(item.deliveryPlannedMoment).toLocaleDateString()}
                      </div>

                      {item?.attributes?.["Длина в мм"] && (
                        <div className="mt-1 text-xs text-muted-foreground">
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
    </>
  );
}