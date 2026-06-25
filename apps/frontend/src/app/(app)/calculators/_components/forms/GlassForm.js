'use client';
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector } from "react-redux"
import { useMemo } from "react"
import BottomButtons from "./BottomButtons"
const filterWords = ['стекло', 'зеркало']

export default function GlassForm() {
    const form = useForm({
        defaultValues: {
            material: '',
            width: '',
            height: '',
            processing: '',
            drills: '',
            zenk: '',
            cutsv1: '',
            cutsv2: '',
            cutsv3: '',
            color: '',
            print: '',
            shape: true,
            tempered: true,
            quantity: '',
            rounding: 'Округление до 0.5',
        }
    })
    const materials = useSelector((state) => state.app?.selfcost?.materials)
    const colors = useSelector(state => state.app?.selfcost?.colors)

    const materialsArray = useMemo(() => {
        if (!materials || materials.length === 0) return []

        return Object.keys(materials)
            .filter(el => filterWords.some(word => el.toLowerCase().includes(word)))
            .sort()
    }, [materials])
    const colorsArray = useMemo(() => {
        if (!colors || colors.length === 0) return []
        return Object.keys(colors).sort()
    }, [colors]);

    if(!materials || materials.length === 0 || !colors || colors.length === 0) {
        return (
            <div className="flex justify-center">
                <p className="text-muted-foreground">Материалы не загружены</p>
            </div>
        )
    }
    const formFields = [
        { name: 'material', type: 'select', label: 'Материал', options: materialsArray, required: true },
        { name: 'width', type: 'input', label: 'Ширина, мм', required: true },
        { name: 'height', type: 'input', label: 'Высота, мм', required: true },
        { name: 'processing', type: 'select', label: 'Вид обработки', options: ['Притупка', 'Шлифовка', 'Полировка'], required: true },
        { name: 'drills', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'zenk', type: 'inputp0', label: 'Зенкование, шт' },
        { name: 'cutsv1', type: 'inputp0', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'inputp0', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'inputp0', label: 'Вырезы 3 кат. шт' },
        { name: 'color', type: 'select', label: 'Цвет', options: colorsArray },
        { name: 'print', type: 'input', label: 'Печать, м2'},
        { name: 'shape', type: 'checkbox', label: 'Прямоугольная форма'},
        { name: 'tempered', type: 'checkbox', label: 'Закаленное'},
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
        { name: 'rounding', type: 'select', label: 'Округление', options: ['Округление до 0.3', 'Округление до 0.5', 'Умножить на 2'], required: true },
    ]

    function onSubmit(values) {
        console.log(values)
    }

    return (
        <div className="flex justify-center">
            <form id="GlassForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 max-w-sm w-full">
                {formFields.map((field) => (
                    <RenderField key={field.name} data={{ ...field, control: form.control }} />
                ))}
                <BottomButtons form={form} />
            </form>
        </div>
    )
}