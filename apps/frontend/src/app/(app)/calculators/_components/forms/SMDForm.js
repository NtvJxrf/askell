'use client';
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/smd"
import { addPosition } from "@/lib/slice"
export default function SMDForm({ dv = null }) {
    const dispatch = useDispatch()
    const selfcost = useSelector((state) => state.app?.selfcost)
    const colors = selfcost?.colors || {}
    const colorsArray = useMemo(() => {
        if (!colors) return []
        return Object.keys(colors).sort()
    }, [colors]);

    if(!colors) {
        return (
            <div className="flex justify-center">
                <p className="text-muted-foreground">Материалы не загружены</p>
            </div>
        )
    }
    const formFields = [
        { name: 'smdType', type: 'select',label: 'Тип СМД', options: ['Иное', 'Krystal', 'Round', 'Lux', 'Premium', 'Standart', 'Hexagon'], required: true },
        { name: 'material', type: 'select', label: 'Материал', options: ['Стекло Matelux, 4 мм', 'Стекло осветленное OptiWhite, 4 мм', 'Стекло М1, 4 мм'], required: true },
        { name: 'width', type: 'input', label: 'Ширина, мм', required: true },
        { name: 'height', type: 'input', label: 'Высота, мм', required: true },
        { name: 'marker', type: 'select', label: 'Маркер', options: ['Белый', 'Черный'], required: true },
        { name: 'magnets', type: 'inputp0', label: 'Магниты, шт' },
        { name: 'color', type: 'combobox', label: 'Цвет', options: colorsArray },
        { name: 'drillssmd', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'cuts', type: 'inputp0', label: 'Вырезы, шт' },
        { name: 'rounds', type: 'inputp0', label: 'Скругления, шт' },
        { name: 'print', type: 'checkbox', label: 'Печать' },
        { name: 'notax', type: 'checkbox', label: 'Optiwhite без наценки' },
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
    ]

    const form = useForm({
        shouldUnregister: true,
        defaultValues: {
            ...formFields.reduce((acc, field) => {
                acc[field.name] = "";
                return acc;
            }, {}),
            print: false,
            notax: false,
            quantity: 1,
            ...dv
        }
    })

    function onSubmit(values) {
        const result = calculate(values, selfcost)
        console.log(result)
        dispatch(addPosition(result))
    }

    return (
        <div className="flex justify-center min-w-[200px]">
            <form id="SMDForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 max-w-sm w-full">
                {formFields.map((field) => (
                    <RenderField key={field.name} data={{ ...field, control: form.control }} />
                ))}
                <BottomButtons form={form} />
            </form>
        </div>
    )
}