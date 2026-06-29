'use client';
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/smd"
import { addPosition } from "@/lib/slice"
export default function SMDForm() {
    const form = useForm({
        defaultValues: {
            smdType: '',
            material: '',
            width: undefined,
            height: undefined,
            marker: '',
            magnets: undefined,
            color: '',
            drillssmd: undefined,
            cuts: undefined,
            rounds: undefined,
            print: false,
            notax: false,
            quantity: undefined,
        }
    })
    const dispatch = useDispatch()
    const selfcost = useSelector((state) => state.app?.selfcost)
    const colors = selfcost?.colors
    const colorsArray = useMemo(() => {
        if (!colors || colors.length === 0) return []
        return Object.keys(colors).sort()
    }, [colors]);

    if(!colors || colors.length === 0) {
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
        { name: 'color', type: 'select', label: 'Цвет', options: colorsArray },
        { name: 'drillssmd', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'cuts', type: 'inputp0', label: 'Вырезы, шт' },
        { name: 'rounds', type: 'inputp0', label: 'Скругления, шт' },
        { name: 'print', type: 'checkbox', label: 'Печать' },
        { name: 'notax', type: 'checkbox', label: 'Optiwhite без наценки' },
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
    ]

    function onSubmit(values) {
        const result = calculate(values, selfcost)
        console.log(result)
        dispatch(addPosition(result))
    }

    return (
        <div className="flex justify-center">
            <form id="SMDForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 max-w-sm w-full">
                {formFields.map((field) => (
                    <RenderField key={field.name} data={{ ...field, control: form.control }} />
                ))}
                <BottomButtons form={form} />
            </form>
        </div>
    )
}