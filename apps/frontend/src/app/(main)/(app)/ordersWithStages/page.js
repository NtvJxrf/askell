'use client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useSelector } from "react-redux"
import { useMemo, useState, useEffect } from "react"
import { backend } from "@/lib/backend"
import { buttonVariants } from "@/components/ui/button"
import { ChevronsUpDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
export default function ProductionPage() {
  const heapsRaw = useSelector((state) => state.app.heaps)
  const [ordersWithoutProductionTasks, setOrdersWithoutProductionTasks] = useState(null);
  const [open, setOpen] = useState(false);
  const heaps = useMemo(() => {
    if (!heapsRaw) return null;
    const result = {};
    for (const [stage, items] of Object.entries(heapsRaw)) {
      result[stage] = items.filter(item => item.tier < 2);
    }
    return result;
  }, [heapsRaw]);
  const [filters, setFilters] = useState({
    order: "",
    productiontask: "",
    stage: "",
    productName: "",
  });
  const groupedHeaps = useMemo(() => {
    if (!heaps) return [];

    const flatItems = Object.entries(heaps).flatMap(([stage, items]) =>
      items.map(item => ({
        ...item,
        stage,
      }))
    );

    const ordersMap = new Map();

    for (const item of flatItems) {
      if(filters.productiontask &&!item.taskName.includes(filters.productiontask)) continue
      if(filters.stage && !item.stage.toLowerCase().includes(filters.stage.toLowerCase())) continue
      if(filters.order && !item.taskAttrs?.["№ заказа покупателя"]?.includes(filters.order)) continue
      if(filters.productName && !item.name.toLowerCase().includes(filters.productName.toLowerCase())) continue

      const orderId = item?.taskAttrs?.["№ заказа покупателя"]?.trim() || "UNKNOWN";

      const key = item.productionRowId;

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, new Map());
      }

      const itemsMap = ordersMap.get(orderId);

      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          ...item,
          quantity: 1,
        });
      } else {
        itemsMap.get(key).quantity += 1;
      }
    }

    return Array.from(ordersMap.entries())
      .map(([orderId, itemsMap]) => {
        const items = Array.from(itemsMap.values()).sort(
          (a, b) =>
            new Date(a.deliveryPlannedMoment) -
            new Date(b.deliveryPlannedMoment)
        );

        return {
          orderId,
          items,
          minDate: new Date(items[0].deliveryPlannedMoment),
        };
      })
      .sort((a, b) => a.minDate - b.minDate);
  }, [heaps, filters]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await backend('/data-refresher/ordersWithoutProductionTasks')
        setOrdersWithoutProductionTasks(response);
      } catch (error) {
        console.error("Error fetching heaps:", error);
      }
    };
    fetchData();
  }, []);
  console.log(ordersWithoutProductionTasks)
  console.log(ordersWithoutProductionTasks?.result && ordersWithoutProductionTasks?.result?.length > 0)
  return (
    <>
      {ordersWithoutProductionTasks?.result && ordersWithoutProductionTasks?.result?.length > 0 && (
        <div>
          <Collapsible open={open} onOpenChange={setOpen} className="mx-2 mt-2">
            <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit gap-1.5")}>
              <ChevronsUpDown className="size-4" />
              {open ? 'Скрыть заказы без ПЗ' : 'Показать заказы без ПЗ'}
            </CollapsibleTrigger>
            <CollapsibleContent >
              <h1>Обновлено: {new Date(ordersWithoutProductionTasks.moment).toLocaleString()}</h1>
              <Table className="table-fixed w-auto">
                <TableHeader className="text-[14px]">
                  <TableRow>
                    <TableHead className="text-center border">№ заказа</TableHead>
                    <TableHead className="border">Контрагент</TableHead>
                    <TableHead className="text-center border">Дата отгрузки</TableHead>
                    <TableHead className="text-center border">Сумма заказа</TableHead>
                    <TableHead className="text-center border">Оплачено</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {ordersWithoutProductionTasks.result.map(order => {
                      return (
                        <TableRow key={order.name}>
                        <TableCell className="truncate border"><span title={order.name}>{order.name}</span></TableCell>
                        <TableCell className="truncate border"><span title={order.agent}>{order.agent}</span></TableCell>
                        <TableCell className="text-center border">
                          {new Date(order.deliveryPlannedMoment).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center border">{order.sum}</TableCell>
                        <TableCell className="text-center border">{order.payedSum}</TableCell>
                      </TableRow>
                      )
                  })}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
      <div className="flex gap-2 p-2 border-b items-center">
        <Input
          className="max-w-[200px]"
          placeholder="Номер заказа"
          value={filters.order}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              order: e.target.value,
            }))
          }
        />
        <Input
          className="max-w-[200px]"
          placeholder="Номер ПЗ"
          value={filters.productiontask}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              productiontask: e.target.value,
            }))
          }
        />
        <Input
          className="max-w-[200px]"
          placeholder="Этап"
          value={filters.stage}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              stage: e.target.value,
            }))
          }
        />
        <Input
          className="max-w-[200px]"
          placeholder="Название товара"
          value={filters.productName}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              productName: e.target.value,
            }))
          }
        />
      </div>
      <OrdersTable groups={groupedHeaps} />
    </>
  );
}

export function OrdersTable({ groups }) {
  return (
    <Table className="table-fixed w-full">
      <TableHeader className="text-[14px]">
        <TableRow>
          <TableHead className="w-[80px] text-center border-r">№ заказа</TableHead>
          <TableHead className="border-r">Товар</TableHead>
          <TableHead className="w-[150px] text-center border-r">Этап</TableHead>
          <TableHead className="w-[60px] text-center border-r">Кол-во</TableHead>
          <TableHead className="w-[80px] text-center border-r">№ ПЗ</TableHead>
          <TableHead className="w-[140px] text-center border-r">
            Дата отгрузки
          </TableHead>
          <TableHead className="w-[100px] text-center border-r">
            Просрочен
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {groups.map(group =>
          group.items.map((item, index) => {
            const isOverdue = overdue(item);
            return (
              <TableRow key={item.productionRowId}>
              {index === 0 && (
                <TableCell
                  rowSpan={group.items.length}
                  className="text-center align-middle font-bold border-r"
                >
                  {group.orderId}
                </TableCell>
              )}

              <TableCell className="truncate border-r"><span title={item.name}>{item.name}</span></TableCell>

              <TableCell className="truncate  border-r"><span title={item.stage}>{item.stage}</span></TableCell>

              <TableCell className="text-center border-r">
                {item.quantity}
              </TableCell>

              <TableCell className="text-center border-r">
                {item.taskName}
              </TableCell>

              <TableCell className="text-center border-r">
                {new Date(
                  item.deliveryPlannedMoment
                ).toLocaleDateString()}
              </TableCell>

              <TableCell className={`text-center border-r ${isOverdue ? "text-red-500 dark:text-red-400" : ""}`}>
                {isOverdue ? "Да" : "Нет"}
              </TableCell>
            </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  );
}
const overdue = (item) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const itemDate = new Date(item.deliveryPlannedMoment);

  return itemDate < today;
};