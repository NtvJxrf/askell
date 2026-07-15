import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
export default function ItemDialog({ item, index, open, onOpenChange }) {
    const materials = item?.result?.materials
    const works = item?.result?.works
    const finalPrice = item?.result?.finalPrice
    const totalMaterials = materials?.reduce((sum, item) => sum + (item.calcValue || item.value || 0), 0)
    const totalWorks = works?.reduce((sum, item) => sum + ((item.value || 0) + (item?.tax || 0)), 0)
    const totalWorkshopExpenses = works?.reduce((sum, item) => sum + (item.workshopExpenses || 0), 0)
    const totalCommercialExpenses = works?.reduce((sum, item) => sum + (item.commercialExpenses || 0), 0)
    const totalHouseholdExpenses = works?.reduce((sum, item) => sum + (item.householdExpenses || 0), 0)
    const totalExpenses = totalWorkshopExpenses + totalCommercialExpenses + totalHouseholdExpenses
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="min-w-max gap-0">
                <Button className="absolute left-1 top-1" onClick={async () => { await navigator.clipboard.writeText(JSON.stringify(item?.initialData)); toast.success('Скопировано в буфер обмена'); }} variant="ghost">
                    JSON
                </Button>
                <DialogHeader className="text-center">
                    <DialogTitle className="text-base mb-4 text-[18px] font-semibold">
                        Детали позиции {index + 1}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex gap-2 overflow-y-auto">
                    <div>
                        {materials && materials.length > 0 && (
                            <div>
                                <Label className="text-xl mb-2">
                                    Материалы
                                </Label>
                                {materials.map((material, index) => (
                                    <div key={index} className="flex items-center pb-0.5 gap-1">
                                        <span className="text-sm max-w-[500px] truncate" title={material.name}>{material.name}:</span>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="text-sm border-b border-dotted border-current">{formatPrice(material?.value)}</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="min-w-max whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {material.formula && (
                                                        <div><strong>Формула:</strong> {material.formula}</div>
                                                    )}
                                                    {material.string && (
                                                        <div><strong>Пояснение:</strong> {material.string}</div>
                                                    )}
                                                    {material.value && (
                                                        <div><strong>Цена:</strong> {formatPrice(material.value)}</div>
                                                    )}
                                                    {material.calcValue && (
                                                        <div>
                                                            <strong>Цена с типом цен "Для калькулятора":</strong> {formatPrice(material.calcValue)}
                                                        </div>
                                                    )}
                                                    {material.objectValue > 0 && (
                                                        <div>
                                                            <strong>Цена с типом цен "Для коммерческих объектов":</strong> {formatPrice(material.objectValue)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                ))}
                                <div className='gap-1'>
                                    <strong className="text-[16px] whitespace-nowrap">Итого:</strong>
                                    <span className="text-sm">{totalMaterials.toFixed(2)}</span>
                                </div>
                                <Separator className="my-1"/>
                            </div>
                        )}
                        {works && works.length > 0 && (
                            <div>
                                <Label className="text-xl mb-2">
                                    Работы
                                </Label>
                                {works.map((work, index) => (
                                    <div key={index} className="flex items-center pb-0.5 gap-1">
                                        <span className="text-sm">{work.name}:</span>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="text-sm border-b border-dotted border-current">{formatPrice(work?.value) || 'Неизвестно'}</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="min-w-max whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {work.formula && (
                                                        <div><strong>Формула:</strong> {work.formula}</div>
                                                    )}
                                                    {work.string && (
                                                        <div><strong>Пояснение:</strong> {work.string}</div>
                                                    )}
                                                    {work.value && (
                                                        <div><strong>ФОТ:</strong> {formatPrice(work.value)}</div>
                                                    )}
                                                    {work.tax > 0 && (
                                                        <div>
                                                            <strong>Налог:</strong> {formatPrice(work.tax)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                ))}
                                <div className='gap-1'>
                                    <strong className="text-[16px] whitespace-nowrap">Итого:</strong>
                                    <span className="text-sm">{formatPrice(totalWorks)}</span>
                                </div>
                                <Separator className="my-1"/>
                            </div>
                        )}
                        {works && works.length > 0 && (
                            <div>
                                <Label className="text-xl mb-2">
                                    Расходы
                                </Label>
                                <div className="flex items-center gap-1 pb-0.5">
                                    <span className="text-sm">Цеховые:</span>
                                    <span className="text-sm">{formatPrice(totalWorkshopExpenses)}</span>
                                </div>
                                <div className="flex items-center gap-1 pb-0.5">
                                    <span className="text-sm">Коммерческие:</span>
                                    <span className="text-sm">{formatPrice(totalCommercialExpenses)}</span>
                                </div>
                                <div className="flex items-center gap-1 pb-0.5">
                                    <span className="text-sm">Общехозяйственные:</span>
                                    <span className="text-sm">{formatPrice(totalHouseholdExpenses)}</span>
                                </div>
                                <div className="flex items-center gap-1 pb-0.5">
                                    <strong className="text-[16px]">Итого:</strong>
                                    <span className="text-sm">{formatPrice(totalExpenses)}</span>
                                </div>
                                <Separator className="my-1"/>
                            </div>
                        )}
                        {finalPrice && (
                            <div>
                                <Label className="text-xl mb-2">
                                    Цены
                                </Label>
                                {finalPrice.map((material, index) => (
                                    <div key={index} className="flex items-center pb-0.5 gap-1">
                                        <span className="text-sm whitespace-nowrap">{material.name}:</span>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="text-sm border-b border-dotted border-current">{formatPrice(material?.value) || 'Неизвестно'}</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="min-w-max whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {material.formula && (
                                                        <div><strong>Формула:</strong> {material.formula}</div>
                                                    )}
                                                    {material.string && (
                                                        <div><strong>Пояснение:</strong> {material.string}</div>
                                                    )}
                                                    {material.value && (
                                                        <div><strong>Цена:</strong> {formatPrice(material.value)}</div>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="whitespace-nowrap">
                        <Label className="text-xl mb-2">
                            Исходные данные
                        </Label>
                        {Object.entries(item?.initialData || {}).map(([key, value]) => (
                            value !== undefined && value !== null && value != '' && !ignoreLabels.includes(key) && (
                                <div key={key} className="flex items-center pb-0.5 gap-1">
                                    <span className="text-sm whitespace-nowrap">
                                        {getInitialDataLabel(key)}:
                                    </span>
                                    <span className="text-sm max-w-[500px] truncate" title={typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : String(value)}>
                                        {typeof value === 'boolean'
                                            ? (value ? 'Да' : 'Нет')
                                            : value}
                                    </span>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const getInitialDataLabel = (key) => {
    const match = key.match(/^([a-zA-Z_]+)(\d+)$/);

    if (match) {
        const [, baseKey, index] = match;
        return `${initialDataLabels[baseKey] || baseKey} ${index}`;
    }

    return initialDataLabels[key] || key;
};
function formatPrice(price) {
  if (price == null) return '—';
  return `${(price).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
}
const ignoreLabels = ['trims', 'ignoreRestricts']
const initialDataLabels = {
    plane: 'Рамка',
    height: 'Высота',
    width: 'Ширина',
    drills: 'Сверление',
    zenk: 'Зенковка',
    cutsv1: 'Вырез 1 кат.',
    cutsv2: 'Вырез 2 кат.',
    cutsv3: 'Вырез 3 кат.',
    shape: 'Прямоугольная форма',
    tempered: 'Закалка',
    print: 'Печать',
    addTape: 'Дополнительная плёнка',
    rounding: 'Округление',
    customertype: 'Тип клиента',
    trim: 'Коэффицент обрези',
    color: 'Цвет',
    material: 'Материал',
    cuts: `Вырезы`,
    type: 'Тип',
    clientType: 'Тип клиента(Для СМД)',
    rounds: 'Скругления',
    drillssmd: 'Сверление СМД',
    gas: 'Газ',
    blank: 'Пятак',
    under: 'Подстолье',
    smdType: 'Тип СМД',
    quantity: 'Количество',
    marker: 'Маркер',
    lock: 'Дверной замок',
    doorFrame: 'Дверной короб',
    hinge: 'Дверные ветли',
    hingeCount: 'Количество петель',
    // ignoreRestricts: 'Игнорировать ограничения',
    processing: 'Вид обработки',
    sealant: 'Герметик',
};