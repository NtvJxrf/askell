import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
export default function ItemDialog({ item, open, onOpenChange }) {
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
                <DialogHeader>
                    <DialogTitle className="text-base">
                        Детали позиции
                    </DialogTitle>
                </DialogHeader>
                <div className="flex gap-2">
                    <div>
                        {materials && materials.length > 0 && (
                            <div>
                                <Label className="text-xl mb-2">
                                    Материалы
                                </Label>
                                {materials.map((material, index) => (
                                    <div key={index} className="flex items-center pb-0.5 gap-1">
                                        <span className="text-sm whitespace-nowrap">{material.name}:</span>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="text-sm border-b border-dotted border-black">{material?.value?.toFixed(2)}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="flex flex-col gap-1">
                                                    {material.formula && (
                                                        <div><strong>Формула:</strong> {material.formula}</div>
                                                    )}
                                                    {material.string && (
                                                        <div><strong>Пояснение:</strong> {material.string}</div>
                                                    )}
                                                    {material.value && (
                                                        <div><strong>Цена:</strong> {material.value.toFixed(2)}</div>
                                                    )}
                                                    {material.calcValue && (
                                                        <div>
                                                            <strong>Цена с типом цен "Для калькулятора":</strong> {material.calcValue.toFixed(2)}
                                                        </div>
                                                    )}
                                                    {material.objectValue > 0 && (
                                                        <div>
                                                            <strong>Цена с типом цен "Для коммерческих объектов":</strong> {material.objectValue.toFixed(2)}
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
                                                <span className="text-sm border-b border-dotted border-black">{work?.value?.toFixed(2) || 'Неизвестно'}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="flex flex-col gap-1">
                                                    {work.formula && (
                                                        <div><strong>Формула:</strong> {work.formula}</div>
                                                    )}
                                                    {work.string && (
                                                        <div><strong>Пояснение:</strong> {work.string}</div>
                                                    )}
                                                    {work.value && (
                                                        <div><strong>ФОТ:</strong> {work.value.toFixed(2)}</div>
                                                    )}
                                                    {work.tax > 0 && (
                                                        <div>
                                                            <strong>Налог:</strong> {work.tax.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                ))}
                                <div className='gap-1'>
                                    <strong className="text-[16px] whitespace-nowrap">Итого:</strong>
                                    <span className="text-sm">{totalWorks.toFixed(2)}</span>
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
                                    <span className="text-sm">{totalWorkshopExpenses.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-1 pb-0.5">
                                    <span className="text-sm">Коммерческие:</span>
                                    <span className="text-sm">{totalCommercialExpenses.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-1 pb-0.5">
                                    <span className="text-sm">Общехозяйственные:</span>
                                    <span className="text-sm">{totalHouseholdExpenses.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-1 pb-0.5">
                                    <strong className="text-[16px]">Итого:</strong>
                                    <span className="text-sm">{totalExpenses.toFixed(2)}</span>
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
                                                <span className="text-sm border-b border-dotted border-black">{material?.value?.toFixed(2) || 'Неизвестно'}</span>
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
                                                        <div><strong>Цена:</strong> {material.value.toFixed(2)}</div>
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
                            key && value && (
                                <div key={key} className="flex items-center pb-0.5 gap-1">
                                    <span className="text-sm whitespace-nowrap">{initialDataLabels[key] || key}:</span>
                                    <span className="text-sm">{typeof value == 'boolean' ? (value ? 'Да' : 'Нет') : value}</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const initialDataLabels = {
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