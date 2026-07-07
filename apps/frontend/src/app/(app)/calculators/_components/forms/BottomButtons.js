'use client'
import { Button } from "@/components/ui/button"
import { backend } from "@/lib/backend"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState } from "react";
import { store, addPosition } from "@/lib/slice"
import { useDispatch } from "react-redux"
import calculateGlass from "@askell/shared/calc/glass"
import calculateGlasspacket from "@askell/shared/calc/glasspacket"
import calcualteTempering from "@askell/shared/calc/clientGlassTempering"

export default function BottomButtons({ form, aiEndpoint = null }) {
    const [open, setOpen] = useState(false)
    const textRef = useRef(null)
    const dispatch = useDispatch()
    const [result, setResult] = useState(null)
    const [requestError, setRequestError] = useState(null)
    const [disabled, setDisabled] = useState(false)
    const handleAiClick = async () => {
        const text = textRef.current.value
        if (!text) {
            alert("Введите описание позиций")
            return
        }
        setResult(null)
        setRequestError(null)
        try {
            const response = await backend(aiEndpoint,{
                method: 'POST',
                body: { text }
            })
            const selfcost = store.getState().app.selfcost
            const errors = []
            let added = 0
            response.forEach((pos, index) => {
                try{
                    let calculated;
                    switch(aiEndpoint){
                        case '/sklad/ai/glass':
                            calculated = calculateGlass(pos, selfcost)
                            break
                        case '/sklad/ai/glasspacket':
                            calculated = calculateGlasspacket(pos, selfcost)
                            break
                        case '/sklad/ai/tempering':
                            calculated = calcualteTempering(pos, selfcost)
                            break
                    }
                    dispatch(addPosition(calculated))
                    added++
                }catch(err){
                    errors.push({ index: index + 1, message: err.message })
                    console.error(err)
                }
            })
            setResult({ total: response.length, added, errors })
        } catch (error) {
            setRequestError(error.message || String(error))
        }finally {
            setDisabled(false)
        }
    }
    const handleOpenChange = (value) => {
        setOpen(value)
        if (!value) {
            setResult(null)
            setRequestError(null)
        }
    }
    return (
        <div className="flex gap-2 justify-center mt-8">
            <Button type="submit" size="sm">Рассчитать</Button>
            <Button size="sm" variant="destructive" onClick={() => (form.resetToBlank ? form.resetToBlank() : form.reset())}>Сбросить форму</Button>
            {aiEndpoint && <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>ИИ</Button>}
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="gap-0">
                    <DialogHeader className="mb-5">
                        <DialogTitle className="text-base">
                            Добавить позиции через ИИ
                        </DialogTitle>
                    </DialogHeader>
                    <Textarea ref={textRef} placeholder="Введите описание позиций" />
                    <Button className="mt-2" onClick={handleAiClick} disabled={disabled}>Отправить</Button>
                    {requestError && (
                        <p className="mt-3 text-sm text-destructive">
                            Ошибка при отправке запроса к ИИ: {requestError}
                        </p>
                    )}
                    {result && (
                        <div className="mt-3 text-sm space-y-1">
                            <p>
                                Всего позиций: {result.total}, добавлено: {result.added}, ошибок: {result.errors.length}
                            </p>
                            {result.errors.length > 0 && (
                                <ul className="list-disc pl-5 text-destructive">
                                    {result.errors.map(({ index, message }) => (
                                        <li key={index}>
                                            Позиция №{index}: {message}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}