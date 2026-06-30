'use client';
import { useForm } from "react-hook-form"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/clientGlassTempering"
import { addPosition } from "@/lib/slice"
import { toast } from 'sonner'

export default function ClientGlassTemperingForm({ dv = null }) {
    const form = useForm({
        shouldUnregister: true,
        defaultValues: dv || {
            shape: true,
            tempered: true,
            rounding: 'Округление до 0.5',
        }
    })
    const dispatch = useDispatch()
    const selfcost = useSelector((state) => state.app?.selfcost)
    const formFields = [
        { name: 'thickness', type: 'select', label: 'Толщина', options: [4, 5, 6, 8, 10, 12], required: true },
        { name: 'width', type: 'input', label: 'Ширина, мм', required: true },
        { name: 'height', type: 'input', label: 'Высота, мм', required: true },
        { name: 'rounding', type: 'select', label: 'Округление', options: ['Округление до 0.3', 'Округление до 0.5', 'Умножить на 2'], required: true },
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
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
        <div className="flex justify-center min-w-[200px]">
            <form id="ClientGlassTemperingForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 max-w-sm w-full">
                {formFields.map((field) => (
                    <RenderField key={field.name} data={{ ...field, control: form.control }} />
                ))}
                <BottomButtons form={form} />
            </form>
        </div>
    )
}