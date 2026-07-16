'use client'
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsSchema } from "@askell/shared/settings";
import { toast } from "sonner";
import { backend } from "@/lib/backend"
import { store } from "@/lib/slice"
export default function SettingsRow({ skey, item }) {
    const [inputValue, setInputValue] = useState(item.value ?? item.default);
    const handleUpdateSettings = async () => {
        const valid = settingsSchema[skey].schema.safeParse(Number(inputValue))
        const user = store.getState().app.user;
        if(!valid.success) {
            console.error(valid.error)
            toast.error("Некорректное значение");
            return;
        }
        const res = await backend('/data-refresher/setSettings', {
            method: 'POST',
            body: {
                key: skey,
                value: Number(inputValue),
                editor: user.fullname
            },
        });
        if(res == true){
            toast.success("Настройка обновлена");
        } else {
            toast.error(`Ошибка: ${res}`);
        }
    }
    const handleInputChange = (e) => {
        let value = Number(e.target.value);
        if (e.target.value === '') {
            setInputValue('');
            return;
        }
        if (value < settingsSchema[skey].schema.minValue) {
            value = settingsSchema[skey].schema.minValue;
        }
        if (value > settingsSchema[skey].schema.maxValue) {
            value = settingsSchema[skey].schema.maxValue;
        }
        if(value < 0 || isNaN(value)) value = 0;
        setInputValue(value);
    }
    return (
        <TableRow key={skey}>
            <TableCell className="font-medium">
                <Button variant="ghost" onClick={handleUpdateSettings}>
                <ArrowRight/>
                </Button>
            </TableCell>
            <TableCell className="font-medium">
                {skey}
            </TableCell>
            <TableCell>
                <Input
                    className="w-full"
                    type="number"
                    value={inputValue}
                    min={settingsSchema[skey].schema.minValue}
                    max={settingsSchema[skey].schema.maxValue}
                    onChange={handleInputChange}
                />
            </TableCell>
            <TableCell>
                {item.default}
            </TableCell>
            <TableCell className="truncate max-w-[500px]">
                <span title={item.description}>{item.description}</span>
            </TableCell>
            <TableCell>
                {item.editor}
            </TableCell>
        </TableRow>
    )
}