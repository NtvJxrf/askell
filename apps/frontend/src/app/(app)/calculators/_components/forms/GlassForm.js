'use client';
import { useForm } from "react-hook-form"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/glass"
import { addPosition } from "@/lib/slice"
import { toast } from 'sonner'
const filterWords = ['стекло', 'зеркало']

export default function GlassForm() {
    const form = useForm({
        defaultValues: {
            material: '',
            width: undefined,
            height: undefined,
            processing: '',
            drills: undefined,
            zenk: undefined,
            cutsv1: undefined,
            cutsv2: undefined,
            cutsv3: undefined,
            color: '',
            print: undefined,
            shape: true,
            tempered: true,
            quantity: undefined,
            rounding: 'Округление до 0.5',
        }
    })
    const selfcost = useSelector((state) => state.app?.selfcost)
    const dispatch = useDispatch()
    const materials = selfcost?.materials
    const colors = selfcost?.colors

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
        try{
            const res = calculate({...values, width: Number(values.width), height: Number(values.height)}, selfcost)
            console.log(res)
            dispatch(addPosition(res))
        }catch(e){
            toast.error(e.message || 'Ошибка при расчете позиции')
            console.error(e)
        }
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