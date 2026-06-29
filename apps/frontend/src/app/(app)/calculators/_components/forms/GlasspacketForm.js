'use client';
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo, useState, useRef } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/glasspacket"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { addPosition } from "@/lib/slice"

const filterWords = ['стекло', 'зеркало']
const tapesWords = ['пленка']
export default function GlasspacketForm() {
    const form = useForm({
        shouldUnregister: true,
        defaultValues: {
            shape: true,
            tempered: true,
            rounding: 'Округление до 0.5',
        }
    })
    const dispatch = useDispatch()
    const selfcost = useSelector((state) => state.app?.selfcost)
    const materials = selfcost?.materials
    const colors = selfcost?.colors

    const [additionalMaterials, setAdditionalMaterials] = useState([]);

    const materialsArray = useMemo(() => {
        if (!materials || materials.length === 0) return []

        return Object.keys(materials).filter(el => filterWords.some(word => el.toLowerCase().includes(word))).sort()
    }, [materials])
    const planeArray = useMemo(() => {
        return Object.keys(materials).filter(el => el.toLowerCase().includes('рамка')).sort();
    }, [materials]);
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
        { name: 'width', type: 'input', label: 'Ширина, мм', required: true },
        { name: 'height', type: 'input', label: 'Высота, мм', required: true },
        { name: 'gas', type: 'select', label: 'Газ', options: [] },
        { name: 'shape', type: 'checkbox', label: 'Прямоугольная форма' },
        { name: 'sealant', type: 'select', label: 'Герметик', options: [] },
        { name: 'print', type: 'input', label: 'Печать, м2'},
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
    ]
    const materialFields = [
        { name: 'material', type: 'select', label: 'Материал', options: materialsArray, required: true },
        { name: 'processing', type: 'select', label: 'Вид обработки', options: ['Притупка', 'Шлифовка', 'Без обработки'], required: true },
        { name: 'tempered', type: 'checkbox', label: 'Закаленное'},
        { name: 'color', type: 'select', label: 'Цвет', options: colorsArray },
    ]
    function onSubmit(values) {
        const res = calculate(values, selfcost)
        console.log(res)
        dispatch(addPosition(res))
    }
    const handleAddTriplex = () => {

    }
    const handleDeleteTriplex = () => {

    }
    return (
        <div className="flex justify-center">
            <form id="GlasspacketForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-1.5 w-full">
                <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                        {formFields.map((field) => (
                            <RenderField
                                key={field.name}
                                data={{ ...field, control: form.control }}
                            />
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="space-y-2 overflow-y-auto max-h-[408px]">
                            123
                        </div>

                        <div className="mt-auto flex gap-2 justify-center">
                            <Button variant="outline" onClick={handleAddTriplex}>Добавить триплекс</Button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full min-w-0 pt-6">
                    <Popover className="flex-1 min-w-0">
                        <PopoverTrigger render={
                            <Button variant="outline" className="text-left font-normal">
                                Стекло 1
                            </Button>
                        }/>
                        <PopoverContent align="start">
                            <div className="flex-1 space-y-2">
                                {materialFields.map((field) => (
                                    <RenderField
                                        key={field.name}
                                        data={{ ...field, name: `${field.name}1`, control: form.control }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    <div className='flex-1 min-w-[150px]'>
                        <RenderField
                            key={'Рамка 1'}
                            data={{ name: 'plane1', type: 'select', label: 'Рамка 1', options: planeArray,required: true, control: form.control }}
                        />
                    </div>
                    <Popover className="flex-1 min-w-0">
                        <PopoverTrigger render={
                            <Button
                            variant="outline"
                            className="text-left font-normal"
                            >
                                Стекло 2
                            </Button>
                        }/>

                        <PopoverContent align="start">
                            <div className="flex-1 space-y-2">
                                {materialFields.map((field) => (
                                    <RenderField
                                        key={field.name}
                                        data={{ ...field, name: `${field.name}2`, control: form.control }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    <div className='flex-1 min-w-[150px]'>
                        <RenderField
                            key={'Рамка 2'}
                            data={{ name: 'plane2', type: 'select', label: 'Рамка 2', options: planeArray,required: true, control: form.control }}
                        />
                    </div>
                    <Popover className="flex-1 min-w-0">
                        <PopoverTrigger render={
                            <Button
                            variant="outline"
                            className="text-left font-normal"
                            >
                                Стекло 3
                            </Button>
                        }/>

                        <PopoverContent align="start">
                            <div className="flex-1 space-y-2">
                                {materialFields.map((field) => (
                                    <RenderField
                                        key={field.name}
                                        data={{ ...field, name: `${field.name}3`, control: form.control }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <BottomButtons form={form} />
            </form>
        </div>
    )
}