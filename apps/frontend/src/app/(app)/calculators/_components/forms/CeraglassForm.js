'use client';
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo, useState, useRef } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/ceraglass"
import { addPosition } from "@/lib/slice"

const glassAndCera = ['стекло', 'плита'];
const ceraExcludedWords = ['плита']
const doorFrameWords = ['короб']
const lockWords = ['замок']
const hingeWords = ['петля']
export default function CeraglassForm({ dv = null }) {
    const form = useForm({
        shouldUnregister: true,
        defaultValues: {
            shape: true,
            tempered: true,
            rounding: 'Округление до 0.5',
            ...dv
        }
    })
    const dispatch = useDispatch()
    const selfcost = useSelector((state) => state.app?.selfcost)
    const materials = selfcost?.materials || {}
    const colors = selfcost?.colors || {}
    const unders = selfcost?.unders || {}

    const [additionalMaterials, setAdditionalMaterials] = useState([]);
    const materialCount = useRef(1);

    const materialsArray = useMemo(() => {
        if (!materials || materials.length === 0) return []

        return [...Object.keys(materials).filter(el => glassAndCera.some(word => el.toLowerCase().includes(word))).sort(), 'Керамика клиента']
    }, [materials])
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
        { name: 'material2', type: 'combobox', label: 'Материал 2', options: materialsArray },
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
    function onSubmit(values) {
        const res = calculate(values, selfcost)
        console.log(res)
        dispatch(addPosition(res))
    }
const handleAddMaterial = () => {
    const count = materialCount.current;

    console.log(count);

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
}; 
    const handleDeleteMaterial = () => {
        setAdditionalMaterials(prev => {
            if (prev.length === 0) return prev
            return prev.slice(0, -2);
        });
        if (materialCount.current > 1) {
            materialCount.current--;
        }
    }
    console.log('additionalMaterials', additionalMaterials);
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