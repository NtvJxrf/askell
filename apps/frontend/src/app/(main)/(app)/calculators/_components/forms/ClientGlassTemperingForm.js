'use client';
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/clientGlassTempering"
import { addPosition, replacePosition } from "@/lib/slice"
import { toast } from 'sonner'
import useCalculatorForm from "./useCalculatorForm"

export default function ClientGlassTemperingForm({ dv = null, editingIndex = null, onOpenChange = null }) {
    const dispatch = useDispatch()
    const selfcost = useSelector((state) => state.app?.selfcost)
    const user = useSelector((state) => state.app?.user)
    const formFields = [
        { name: 'thickness', type: 'select', label: 'Толщина', options: [4, 5, 6, 8, 10, 12], required: true },
        { name: 'width', type: 'input', label: 'Ширина, мм', required: true },
        { name: 'height', type: 'input', label: 'Высота, мм', required: true },
        { name: 'rounding', type: 'select', label: 'Округление', options: ['Округление до 0.3', 'Округление до 0.5', 'Умножить на 2'], required: true },
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
    ]

    if(['Игнорировать ограничения', 'Админ'].some(role => user?.roles?.includes(role))){
        formFields.push({ name: 'ignoreRestricts', type: 'checkbox', label: 'Игнорировать ограничения', checked: false })
    }

    const form = useCalculatorForm('tempering', {
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

    return (
        <div className="flex justify-center min-w-[200px]">
            <form id="ClientGlassTemperingForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 max-w-sm w-full">
                {formFields.map((field) => (
                    <RenderField key={field.name} data={{ ...field, control: form.control }} />
                ))}
                <BottomButtons form={form} aiEndpoint="/sklad/ai/tempering"/>
            </form>
        </div>
    )
}