import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { backend } from "@/lib/backend";
import { store } from "@/lib/slice";
import { useSelector } from "react-redux";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
export default function ItemDialog({ item, open, onOpenChange }) {
  const quantityRef = useRef(null);
  const descriptionRef = useRef(null);
  const [disabled, setDisabled] = useState(false);
  const stock = useSelector((state) => state.app?.selfcost?.stock) || {};
  const handleDefect = async () => {
    if(descriptionRef.current?.value === undefined || descriptionRef.current?.value.trim() === "") {
        toast.error("Введите комментарий для брака");
        return;
    }
    try{
      setDisabled(true)
      const user = store.getState().app.user;
      const res = await backend('/productionCompletion/defect', {
        method: 'POST',
        body: {
          quantity: Number(quantityRef.current?.value ?? 1),
          description: descriptionRef.current?.value ?? "",
          item,
          user
        },
      });
      if(res){
        toast.success("Операция выполнена");
        onOpenChange(false);
      } else {
        toast.error(`Ошибка: ${res}`);
      }
    }catch(err){
      console.error(err)
      toast.error(`Ошибка: ${err.message || String(err)}`);
    }finally{
      setDisabled(false)
    }
  };

  const handleComplete = async () => {
    try{
      setDisabled(true)
      const user = store.getState().app.user;
      const res = await backend('/productionCompletion/complete', {
        method: 'POST',
        body: {
          quantity: Number(quantityRef.current?.value ?? 1),
          description: descriptionRef.current?.value ?? "",
          item,
          user
        },
      });
      if(res == true){
        toast.success("Операция выполнена");
        onOpenChange(false);
      } else {
        toast.error(`Ошибка: ${res}`);
      }
    }catch(err){
      console.error(err)
      toast.error(`Ошибка: ${err.message || String(err)}`);
    }finally{
      setDisabled(false)
    }
  };

  const handleChange = (e) => {
    if (e.target.value === "") {
      return;
    }

    let value = Number(e.target.value);

    if (Number.isNaN(value)) {
      return;
    }

    if (value > item?.quantity) {
        value = item?.quantity;
        e.target.value = value;
    }
  };

  const handleBlur = (e) => {
    let value = Number(e.target.value);

    if (e.target.value === "" || Number.isNaN(value) || value < 1) {
        value = 1;
    }
    if (value > item?.quantity) {
        value = item?.quantity;
    }

    e.target.value = value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base line-clamp-3">
            {item?.name}
          </DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="min-h-0 space-y-4 overflow-y-auto text-sm">
          <div className="space-y-1">
            <div>
              <span className="text-muted-foreground">№ заказа:</span>{" "}
              <span className="font-medium">
                {item?.taskAttrs?.["№ заказа покупателя"]}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground">№ ПЗ:</span>{" "}
              <span className="font-medium">{item?.taskName}</span>
            </div>

            <div>
              <span className="text-muted-foreground">Дата:</span>{" "}
              <span className="font-medium">
                {item?.deliveryPlannedMoment &&
                  new Date(item.deliveryPlannedMoment).toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground">Количество:</span>{" "}
              <span className="font-medium">{item?.quantity}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">          
            <Collapsible key="parameters">
              <CollapsibleTrigger className="flex w-full items-center text-sm font-semibold uppercase mb-1">
                <span>Параметры</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                {item?.attributes &&
                  Object.entries(item.attributes).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium text-right">
                        {typeof value === "boolean"
                          ? value
                            ? "Да"
                            : "Нет"
                          : String(value)}
                      </span>
                    </div>
                  ))}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold uppercase mb-1">
                Маршрут
              </div>

              {item?.productionPath?.map((stage) => {
                const isCurrent =
                  stage.productionStageId === item?.productionStageId;

                return (
                  <div
                    key={stage.productionStageId}
                    className={`flex items-center gap-2 rounded-sm ${
                      isCurrent
                        ? "font-semibold text-green-700 dark:text-green-400"
                        : ""
                    }`}
                  >
                    {isCurrent ? (
                      <span className="text-green-600 dark:text-green-400">
                        ●
                      </span>
                    ) : (
                      <span className="text-gray-300">○</span>
                    )}

                    {stage.stageName}
                  </div>
                );
              })}
            </div>
            <Separator orientation="vertical" className="hidden sm:block"/>
            <div className="space-y-1">
              <div className="text-sm font-semibold uppercase mb-1">
                Материалы на текущем этапе
              </div>

              {Object.entries(item?.productionPath?.[item.orderingPosition]?.materials || {}).map(([id, quantity]) => {
                const stockQuantity = stock[id][item.materialsStoreId] || 0;
                const isEnough = Number(quantity) <= Number(stockQuantity);

                return (
                  <div key={id} className="flex justify-between gap-2">
                    <span
                      className="text-muted-foreground truncate min-w-0 max-w-[200px]"
                      title={stock[id].name}
                    >
                      {stock[id].name}:
                    </span>

                    <span
                      className={`font-medium text-right ${
                        isEnough ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatNumber(quantity)}/{formatNumber(stockQuantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="font-semibold">Количество</div>

            <div className="flex gap-2">
              <Input
                ref={quantityRef}
                type="number"
                min={1}
                max={item?.quantity}
                defaultValue={1}
                onChange={handleChange}
                onBlur={handleBlur}
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (quantityRef.current) {
                    quantityRef.current.value = item?.quantity ?? 1;
                  }
                }}
              >
                Максимум
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold">Комментарий</div>

            <Textarea
              ref={descriptionRef}
              placeholder="Введите комментарий..."
            />
          </div>

          <div className="flex">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDefect}
              disabled={disabled}
            >
              Указать брак
            </Button>

            <Button
              type="button"
              className="ml-auto"
              size="sm"
              onClick={handleComplete}
              disabled={disabled}
            >
              Выполнить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const formatNumber = (value) => {
  return Number(value?.toFixed(2)).toString();
};