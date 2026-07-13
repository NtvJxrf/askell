'use client'
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSelector } from "react-redux";
import { backend } from "@/lib/backend";
import { toast } from "sonner";
import SettingsRow from "./settingsRow";
export default function SettingsPage() {
  const [disabled, setDisabled] = useState(null);
  const selfcost = useSelector((state) => state.app.selfcost);
  const settings = useSelector((state) => state.app.settings);
  const user = useSelector((state) => state.app.user);
  const updateKeys = [
    { label: "Материалы", key: "materials", function: "getMaterials" },
    { label: "Упаковочные материалы", key: "packaging", function: "getPackagingMaterials" },
    { label: "Этапы", key: "processingStages", function: "getProcessingStages" },
    { label: "Склады", key: "stores", function: "getStores" },
    { label: "Подстолья", key: "unders", function: "getUnders" },
    { label: "Цвета", key: "colors", function: "getColors" },
    { label: "Цены и коэффиценты", key: "pricesAndCoefs", function: "getPricesAndCoefs" },
    { label: "Этапы и нормы", key: "stagesAndNorms", function: "getStagesAndNorms" },
    { label: "Атрибуты", key: "attributes", function: "getAttributes" },
    { label: "Техкарты для смд", key: "smdPlans", function: "getProcessingPlansSmd" },
    { label: "Валюты", key: "currencies", function: "getCurrency" },
    { label: "Типы цен", key: "priceTypes", function: "getPriceTypes" },
    { label: "Сотрудники", key: "employees", function: "getEmployees" },
    { label: "Остатки", key: "stock", function: "getStock" },
  ]
  const data =  updateKeys.map((item) => ({
    ...item,
    updatedAt: selfcost?.updates?.[item.key] || null,
  }));

  const handleRefresh = async (item) => {
    setDisabled(true);
    try{
      const res = await backend(`/data-refresher/updateEntity`, {
        method: "POST",
        body: { entity: item.function },
      });
    }catch(e){
      console.error(e)
      toast.error('Ошибка при обновлении данных');
    }finally{
      setDisabled(false);
    }
  };
  return (
    <div className="flex h-screen overflow-x-auto overflow-y-hidden text-sm">
      <div className="flex-1 min-w-0 p-6">
        <Button size="sm" onClick={async () => {
          setDisabled(true);
          try{
            const res = await backend(`/data-refresher/updateAllEntities`, {
              method: "POST",
            });
            toast.success('Данные обновлены');
          }catch(e){
            console.error(e)
            toast.error('Ошибка при обновлении данных');
          }finally{
            setDisabled(false);
          }
        }}>Обновить все</Button>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Последнее обновление</TableHead>
              <TableHead className="w-[140px]"> Обновить</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item) => (
              <TableRow key={item.key}>
                <TableCell className="font-medium">
                  {item.label}
                </TableCell>

                <TableCell>{item.updatedAt ? new Date(item.updatedAt).toLocaleString("ru-RU") : "Не обновлялось"}</TableCell>

                <TableCell>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => handleRefresh(item)}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${
                        disabled
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Separator orientation="vertical" />

      {user?.roles?.includes('Админ') && (
        <div className="flex-2 min-w-0 p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Ключ</TableHead>
                <TableHead>Текущее значение</TableHead>
                <TableHead>Значение по умолчанию</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Кто обновил</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(settings).map(([key, item]) => (
                <SettingsRow key={key} skey={key} item={item}/>
              ))}
            </TableBody>
          </Table>
        </div> 
      )}
    </div>
  );
}