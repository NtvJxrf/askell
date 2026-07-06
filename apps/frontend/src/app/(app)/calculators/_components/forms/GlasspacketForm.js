'use client';
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector, useDispatch } from "react-redux"
import { useMemo, useState, useRef } from "react"
import BottomButtons from "./BottomButtons"
import calculate from "@askell/shared/calc/glasspacket"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { addPosition, removeTriplexPosition, replaceTriplexPositions, replacePosition } from "@/lib/slice"
import { getMaterialsStock } from "./getStock.js"
import TriplexForm from "./TriplexForm"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
const filterWords = ['стекло', 'зеркало']
export default function GlasspacketForm({ dv = null, editingIndex = null, onOpenChange = null }) {
    const [openAddTriplex, setOpenAddTriplex] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const dispatch = useDispatch()
    const selfcost = useSelector((state) => state.app?.selfcost)
    const materials = selfcost?.materials || {}
    const colors = selfcost?.colors || {}
    const stock = selfcost?.stock || {}
    const triplexArray = useSelector((state) => state.app?.triplexArray)
    const materialsArray = useMemo(() => {
        if (!materials ) return []
        return Object.keys(materials).filter(el => filterWords.some(word => el.toLowerCase().includes(word))).sort().concat(triplexArray.map(el => el.name))
    }, [materials, triplexArray])
    const materialsStock = useMemo(() => {
        return getMaterialsStock(materialsArray, materials, stock)
    }, [materialsArray, materials, stock])
    const planeArray = useMemo(() => {
        return Object.keys(materials).filter(el => el.toLowerCase().includes('рамка')).sort();
    }, [materials]);
    const colorsArray = useMemo(() => {
        if (!colors) return []
        return Object.keys(colors).sort()
    }, [colors]);
    if(!materials || !colors || colors.length === 0) {
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
        { name: 'material', type: 'combobox', label: 'Материал', options: materialsArray, itemLabels: materialsStock, required: true },
        { name: 'processing', type: 'select', label: 'Вид обработки', options: ['Притупка', 'Шлифовка', 'Без обработки'], required: true },
        { name: 'tempered', type: 'checkbox', label: 'Закаленное'},
        { name: 'color', type: 'combobox', label: 'Цвет', options: colorsArray },
    ]
    const form = useForm({
        shouldUnregister: false,
        defaultValues: {
            ...formFields.reduce((acc, field) => {
                acc[field.name] = "";
                return acc;
            }, {}),
            ...materialFields.reduce((acc, field) => {
                acc[field.name] = "";
                return acc;
            }, {}),
            shape: true,
            quantity: 1,
            rounding: 'Округление до 0.5',
            ...dv
        }
    })
    const values = form.watch();
    function onSubmit(values) {
        try{
            const res = calculate(values, selfcost, triplexArray)
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
    const handleEditTriplex = (item, index) => {
        dispatch(replaceTriplexPositions({index, item}))
        setEditingItem(null)
    }
    return (
        <>
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

                        <div className="flex-1 flex flex-col min-w-[150px]">
                            <div className="space-y-2 overflow-y-auto max-h-[180px]">
                                {triplexArray.map((triplex, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <span className="flex-1 truncate text-[14px]" title={triplex.name} onClick={() => setEditingItem({item: triplex, index: index})}>
                                            {triplex.name}
                                        </span>
                                        <Button variant="destructive" onClick={() => dispatch(removeTriplexPosition(index))}>
                                            X
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto flex gap-2 justify-center">
                                <Button variant="outline" onClick={() => setOpenAddTriplex(true)}>Добавить триплекс</Button>
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
                                data={{ name: 'plane2', type: 'select', label: 'Рамка 2', options: planeArray, control: form.control }}
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
                                            data={{ ...field, name: `${field.name}3`, required: false, control: form.control }}
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <BottomButtons form={form} aiEndpoint="/sklad/ai/glasspacket"/>
                </form>
            </div>
            <Dialog open={openAddTriplex} onOpenChange={() => setOpenAddTriplex(!openAddTriplex)}>
                <DialogContent className="min-w-max gap-0">
                    <DialogHeader>
                        <DialogTitle className="text-base mb-5 items-center justify-center flex gap-2">
                            Добавить триплекс для стеклопакетов
                        </DialogTitle>
                    </DialogHeader>
                    <TriplexForm handleAddTriplex={true} dv={{height: values.height, width: values.width}} />
                </DialogContent>
            </Dialog>
            <Dialog open={editingItem} onOpenChange={() => setEditingItem(null)}>
                <DialogContent className="min-w-max gap-0">
                    <DialogHeader>
                        <DialogTitle className="text-base mb-5 items-center justify-center flex gap-2">
                            Редактирование триплекса для стеклопакетов
                        </DialogTitle>
                    </DialogHeader>
                    <TriplexForm handleReplaceTriplex={handleEditTriplex} dv={editingItem?.item?.initialData} index={editingItem?.index} />
                </DialogContent>
            </Dialog>
        </>
    )
}