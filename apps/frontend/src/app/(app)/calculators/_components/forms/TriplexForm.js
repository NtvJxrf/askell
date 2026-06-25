'use client';
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import RenderField from "./RenderField"
import { useSelector } from "react-redux"
import { useMemo, useState, useRef } from "react"

const filterWords = ['стекло', 'зеркало']
const tapesWords = ['пленка']
export default function TriplexForm() {
    const form = useForm({
        defaultValues: {
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
            addTape: '',
            rounding: 'Округление до 0.5',
        }
    })
    const materials = useSelector((state) => state.app?.selfcost?.materials)
    const colors = useSelector(state => state.app?.selfcost?.colors)

    const [additionalMaterials, setAdditionalMaterials] = useState([]);
    const materialCount = useRef(3);

    const materialsArray = useMemo(() => {
        if (!materials || materials.length === 0) return []

        return Object.keys(materials)
            .filter(el => filterWords.some(word => el.toLowerCase().includes(word)))
            .sort()
    }, [materials])
    const tapesArray = useMemo(() => {
        if( !materials || materials.length === 0) return []

        return Object.keys(materials)
            .filter(el => tapesWords.some(word => el.toLowerCase().includes(word)))
            .sort();
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
        { name: 'processing', type: 'select', label: 'Вид обработки', options: ['Притупка', 'Шлифовка', 'Полировка'], required: true },
        { name: 'drills', type: 'inputp0', label: 'Сверление, шт' },
        { name: 'zenk', type: 'inputp0', label: 'Зенкование, шт' },
        { name: 'cutsv1', type: 'inputp0', label: 'Вырезы 1 кат. шт' },
        { name: 'cutsv2', type: 'inputp0', label: 'Вырезы 2 кат. шт' },
        { name: 'cutsv3', type: 'inputp0', label: 'Вырезы 3 кат. шт' },
        { name: 'color', type: 'select', label: 'Цвет', options: colorsArray },
        { name: 'print', type: 'input', label: 'Печать, м2'},
        { name: 'shape', type: 'checkbox', label: 'Прямоугольная форма' },
        { name: 'tempered', type: 'checkbox', label: 'Закаленное' },
        { name: 'quantity', type: 'inputp0', label: 'Количество, шт' },
        { name: 'addTape', type: 'select', label: 'Доп пленка', options: ['Пленка EVA Прозрачная 0,38 мм', 'Пленка EVA Прозрачная 0,76 мм']},
        { name: 'rounding', type: 'select', label: 'Округление', options: ['Округление до 0.3', 'Округление до 0.5', 'Умножить на 2'], required: true },
    ]
    const formMaterialsField = [
        { name: 'material1', type: 'select', label: 'Материал 1', options: materialsArray, required: true },
        { name: 'tape1', type: 'select', label: 'Пленка 1', options: tapesArray, required: true },
        { name: 'material2', type: 'select', label: 'Материал 2', options: materialsArray, required: true },
    ]
    function onSubmit(values) {
        console.log(values)
    }
    const handleAddMaterial = () => {
        setAdditionalMaterials(prev => [
            ...prev,
            { id: `tape${materialCount.current - 1}`, name: `tape${materialCount.current - 1}`, type: 'select', label: `Пленка ${materialCount.current - 1}`, options: tapesArray },
            { id: `material${materialCount.current}`, name: `material${materialCount.current}`, type: 'select', label: `Материал ${materialCount.current}`, options: materialsArray, rules: [{ required: true, message: 'Заполните поле' }] },
        ]);
        materialCount.current++;
    }
    const handleDeleteMaterial = () => {
        setAdditionalMaterials(prev => {
            if (prev.length === 0) return prev
            return prev.slice(0, -2);
        });
        if (materialCount.current > 3) {
            materialCount.current--;
        }
    }
    return (
        <div className="flex justify-center">
            <form id="GlassForm" onSubmit={form.handleSubmit(onSubmit)} className="space-y-1.5 w-full">
                <div className="flex gap-4">
                    <div className="flex-1 space-y-2 ">
                        {formFields.map((field) => (
                            <RenderField
                                key={field.name}
                                data={{ ...field, control: form.control }}
                            />
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="space-y-2 overflow-y-auto max-h-[408px]">
                            {formMaterialsField.map((field) => (
                                <RenderField
                                    key={field.name}
                                    data={{ ...field, control: form.control }}
                                />
                            ))}
                            {additionalMaterials.map((field) => (
                                <RenderField
                                    key={field.name}
                                    data={{ ...field, control: form.control }}
                                />
                            ))}
                        </div>

                        <div className="mt-auto flex gap-2 justify-center">
                            <Button variant="outline" onClick={handleAddMaterial}>Добавить ПФ</Button>
                            <Button variant="outline" onClick={handleDeleteMaterial}>Удалить ПФ</Button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-center mt-10">
                    <Button type="submit" size="sm">Рассчитать</Button>
                    <Button size="sm" onClick={() => form.reset()}>Сбросить форму</Button>
                </div>
            </form>
        </div>
    )
}