'use client';
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo, useState, useRef } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/ceraglass"
import { addPosition, replacePosition, setFormMeta } from "@/lib/slice"
import { getMaterialsStock } from "./getStock.js"
import useCalculatorForm, { getPersistedFormMeta } from "./useCalculatorForm"

const glassAndCera = ['стекло', 'плита'];
const ceraExcludedWords = ['плита']
const doorFrameWords = ['короб']
const lockWords = ['замок']
const hingeWords = ['петля']
export default function CeraglassForm({ dv = null, editingIndex = null, onOpenChange = null }) {
    const dispatch = useDispatch()
    const isEditing = dv != null
    const selfcost = useSelector((state) => state.app?.selfcost)
    const user = useSelector((state) => state.app?.user)
    const materials = selfcost?.materials || {}
    const colors = selfcost?.colors || {}
    const unders = selfcost?.unders || {}
    const stock = selfcost?.stock || {}

    const [additionalMaterials, setAdditionalMaterials] = useState(() => {
        const persistedCount = getPersistedFormMeta('ceraglass', isEditing)?.materialCount || 1;
        const fields = [];
        for (let i = 1; i < persistedCount; i++) {
            fields.push(
                { id: `width${i}`, name: `width${i}`, type: 'inputp0', label: `Ширина ${i}` },
                { id: `height${i}`, name: `height${i}`, type: 'inputp0', label: `Высота ${i}` },
            );
        }
        return fields;
    });
    const materialCount = useRef(getPersistedFormMeta('ceraglass', isEditing)?.materialCount || 1);

    const materialsArray = useMemo(() => {
        if (!materials || materials.length === 0) return []

        return [...Object.keys(materials).filter(el => glassAndCera.some(word => el.toLowerCase().includes(word))).sort(), 'Керамика клиента']
    }, [materials])
    const materialsStock = useMemo(() => {
        return getMaterialsStock(materialsArray, materials, stock)
    }, [materialsArray, materials, stock])
    const ceraArray = useMemo(() => {
        if (!materials || materials.length === 0) return []
        return [...Object.keys(materials).filter(el => ceraExcludedWords.some(word => el.toLowerCase().includes(word))).sort(), 'Керамика клиента']
    }, [materials])
    const colorsArray = useMemo(() => {
        if (!colors || colors.length === 0) return []
        return Object.keys(colors).sort()
    }, [colors]);
    const undersArray = useMemo(() => {
        if (!unders || Object.keys(unders).length === 0) return []
        return Object.keys(unders).sort()
    }, [unders])
    const doorFrameArray = useMemo(() => {
        if (!materials || materials.length === 0) return []
        return Object.keys(materials).filter(el => doorFrameWords.some(word => el.toLowerCase().includes(word))).sort()
    }, [materials])
    const lockArray = useMemo(() => {
        if (!materials || materials.length === 0) return []
        return Object.keys(materials).filter(el => lockWords.some(word => el.toLowerCase().includes(word))).sort()
    }, [materials])
    const hingeArray = useMemo(() => {
        if (!materials || materials.length === 0) return []
        return Object.keys(materials).filter(el => hingeWords.some(word => el.toLowerCase().includes(word))).sort()
    }, [materials])
    if(!selfcost) {
        return (
            <div className="flex justify-center">
                <p className="text-muted-foreground">Материалы не загружены</p>
            </div>
        )
    }
    const formFields = [
        { name: 'type', type: 'select', label: 'Изделие', options: ['Стол', 'Дверь', 'Столешница', 'Керамика'], required: true },
        { name: 'material1', type: 'combobox', label: 'Материал 1', options: ceraArray, required: true },
        { name: 'material2', type: 'combobox', label: 'Материал 2', options: materialsArray, itemLabels: materialsStock },
        { name: 'width', type: 'input', label: 'Ширина изделия, мм', required: true },
        { name: 'height', type: 'input', label: 'Высота изделия, мм', required: true },
        { name: 'cutsv1', type: 'inputp0', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'inputp0', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'inputp0', label: 'Вырезы 3 кат. шт' },
        { name: 'blank', type: 'inputp0', label: 'Количество пятаков', required: true } ,
        { name: 'trim', type: 'input', label: '% обрези', description: 'Указывать десятичное число, например 30% обрези = 0.3' },
        { name: 'color', type: 'combobox', label: 'Цвет', options: colorsArray },
        { name: 'under', type: 'combobox', label: 'Подстолье', options: undersArray },
        { name: 'doorFrame', type: 'combobox', label: 'Дверной короб', options: doorFrameArray },
        { name: 'lock', type: 'combobox', label: 'Дверной замок', options: lockArray },
        { name: 'hinge', type: 'combobox', label: 'Дверные петли', options: hingeArray },
        { name: 'hingeCount', type: 'inputp0', label: 'Количество петель' },
        { name: 'tempered', type: 'checkbox', label: 'Закаленное', cheched: true },
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
    ]
    if(['Игнорировать ограничения', 'Админ'].some(role => user.roles.includes(role))){
        formFields.push({ name: 'ignoreRestricts', type: 'checkbox', label: 'Игнорировать ограничения', checked: false })
    }
    const form = useCalculatorForm('ceraglass', {
        shouldUnregister: true,
        dv,
        defaultValues: {
            ...formFields.reduce((acc, field) => {
                acc[field.name] = "";
                return acc;
            }, {}),
            shape: true,
            tempered: true,
            quantity: 1,
            rounding: 'Округление до 0.5',
        }
    })
    function onSubmit(values) {
        try{
            const res = calculate(values, selfcost)
            if(editingIndex !== null){
                dispatch(replacePosition({ index: editingIndex, item: res }));
                onOpenChange?.(false);
            } else {
                dispatch(addPosition(res))
            }
        }catch(e){
            toast.error(e.message || 'Ошибка при расчете позиции')
            console.error(e)
        }
    }
const handleAddMaterial = () => {
    const count = materialCount.current;
    setAdditionalMaterials(prev => [
        ...prev,
        {
            id: `width${count}`,
            name: `width${count}`,
            type: 'inputp0',
            label: `Ширина ${count}`,
        },
        {
            id: `height${count}`,
            name: `height${count}`,
            type: 'inputp0',
            label: `Высота ${count}`,
        },
    ]);

    materialCount.current = count + 1;
    if (!isEditing) dispatch(setFormMeta({ id: 'ceraglass', meta: { materialCount: materialCount.current } }));
}; 
    const handleDeleteMaterial = () => {
        setAdditionalMaterials(prev => {
            if (prev.length === 0) return prev
            return prev.slice(0, -2);
        });
        if (materialCount.current > 1) {
            materialCount.current--;
        }
        if (!isEditing) dispatch(setFormMeta({ id: 'ceraglass', meta: { materialCount: materialCount.current } }));
    }
    return (
        <div className="flex justify-center">
            <form id="CeraglassForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-1.5 w-full">
                <div className="flex gap-4">
                    <div className="flex-1 min-w-[150px] space-y-2">
                        {formFields.map((field) => (
                            <RenderField
                                key={field.name}
                                data={{ ...field, control: form.control }}
                            />
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col min-w-[150px]">
                        <div className="space-y-2 overflow-y-auto max-h-[530px]">
                            {additionalMaterials.map((field) => (
                                <RenderField
                                    key={field.name}
                                    data={{ ...field, control: form.control }}
                                />
                            ))}
                        </div>

                        <div className="mt-auto flex gap-2 justify-center">
                            <Button type="button" variant="outline" onClick={handleAddMaterial}>Добавить ПФ</Button>
                            <Button type="button" variant="outline" onClick={handleDeleteMaterial}>Удалить ПФ</Button>
                        </div>
                    </div>
                </div>
                <BottomButtons form={form} />
            </form>
        </div>
    )
}