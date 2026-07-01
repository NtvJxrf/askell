import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { backend } from "@/lib/backend";
import { store } from "@/lib/slice";
export default function ItemDialog({ item, open, onOpenChange }) {
  const quantityRef = useRef(null);
  const descriptionRef = useRef(null);

  const handleDefect = () => {
    if(descriptionRef.current?.value === undefined || descriptionRef.current?.value.trim() === "") {
        toast.error("Введите комментарий для брака");
        return;
    }
    console.log("Брак", {
      quantity: Number(quantityRef.current?.value ?? 1),
      description: descriptionRef.current?.value ?? "",
      item,
    });
  };

  const handleComplete = async () => {
    const user = store.getState().app.user;
    console.log("Выполнить", {
      quantity: Number(quantityRef.current?.value ?? 1),
      description: descriptionRef.current?.value ?? "",
      item,
      user
    });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base line-clamp-3">
            {item?.name}
          </DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="space-y-4 text-sm">
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
            <div className="text-sm font-semibold uppercase mb-1">
              Параметры
            </div>

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
          </div>

          <Separator />

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
            >
              Указать брак
            </Button>

            <Button
              type="button"
              className="ml-auto"
              size="sm"
              onClick={handleComplete}
            >
              Выполнить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}