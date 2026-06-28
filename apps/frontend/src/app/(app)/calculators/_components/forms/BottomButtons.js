'use client'
import { Button } from "@/components/ui/button"
export default function BottomButtons({ form }) {
    return (
        <div className="flex gap-2 justify-center mt-8">
            <Button type="submit" size="sm">Рассчитать</Button>
            <Button size="sm" variant="destructive" onClick={() => form.reset()}>Сбросить форму</Button>
        </div>
    )
}