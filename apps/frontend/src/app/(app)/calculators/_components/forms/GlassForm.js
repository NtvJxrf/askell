'use client';
import { useForm } from "react-hook-form"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/glass"
import { addPosition } from "@/lib/slice"
import { getMaterialsStock } from "./getStock.js"
import { toast } from 'sonner'
const filterWords = ['стекло', 'зеркало']

export default function GlassForm({ dv = null }) {
    const selfcost = useSelector((state) => state.app?.selfcost)
    const dispatch = useDispatch()
    const materials = selfcost?.materials || {}
    const colors = selfcost?.colors || {}
    const stock = selfcost?.stock || {}
    const materialsArray = useMemo(() => {
        if (!materials) return []
        return Object.keys(materials).filter(el => filterWords.some(word => el.toLowerCase().includes(word))).sort()
    }, [materials])
    const materialsStock = useMemo(() => {
        return getMaterialsStock(materialsArray, materials, stock)
    }, [materialsArray, materials, stock])
    const colorsArray = useMemo(() => {
        if (!colors) return []
        return Object.keys(colors).sort()
    }, [colors]);

    const formFields = [
        { name: 'material', type: 'combobox', label: 'Материал', options: materialsArray, itemLabels: materialsStock, required: true },
        { name: 'width', type: 'input', label: 'Ширина, мм', required: true },
        { name: 'height', type: 'input', label: 'Высота, мм', required: true },
        { name: 'processing', type: 'select', label: 'Вид обработки', options: ['Притупка', 'Шлифовка', 'Полировка'], required: true },
        { name: 'drills', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'zenk', type: 'inputp0', label: 'Зенкование, шт' },
        { name: 'cutsv1', type: 'inputp0', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'inputp0', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'inputp0', label: 'Вырезы 3 кат. шт' },
        { name: 'color', type: 'combobox', label: 'Цвет', options: colorsArray },
        { name: 'print', type: 'input', label: 'Печать, м2'},
        { name: 'shape', type: 'checkbox', label: 'Прямоугольная форма'},
        { name: 'tempered', type: 'checkbox', label: 'Закаленное'},
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
        { name: 'rounding', type: 'select', label: 'Округление', options: ['Округление до 0.3', 'Округление до 0.5', 'Умножить на 2'], required: true },
    ]

    const form = useForm({
        shouldUnregister: true,
        defaultValues: {
            ...formFields.reduce((acc, field) => {
                acc[field.name] = "";
                return acc;
            }, {}),
            shape: true,
            tempered: true,
            quantity: 1,
            rounding: 'Округление до 0.5',
            ...dv
        }
    })
    if(!materials || !colors) {
        return (
            <div className="flex justify-center">
                <p className="text-muted-foreground">Материалы не загружены</p>
            </div>
        )
    }


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
        <div className="flex justify-center min-w-[200px]">
            <form id="GlassForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 max-w-sm w-full">
                {formFields.map((field) => (
                    <RenderField key={field.name} data={{ ...field, control: form.control }} />
                ))}
                <BottomButtons form={form} aiEndpoint="/sklad/ai/glass"/>
            </form>
        </div>
    )
}