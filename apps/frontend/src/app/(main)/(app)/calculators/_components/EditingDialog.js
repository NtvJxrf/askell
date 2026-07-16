import { useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
    
import GlassForm from "./forms/GlassForm.js";
import SMDForm from "./forms/SMDForm.js";
import TriplexForm from "./forms/TriplexForm.js";
import CeraglassForm from "./forms/CeraglassForm.js";
import GlasspacketForm from "./forms/GlasspacketForm.js";
import ClientGlassTempetingForm from "./forms/ClientGlassTemperingForm.js";

import { toast } from "sonner";

const map = {
    "Стекло": GlassForm,
    "СМД": SMDForm,
    "Триплекс": TriplexForm,
    "Керагласс": CeraglassForm,
    "Стеклопакет": GlasspacketForm,
    "Закалка стекла": ClientGlassTempetingForm,
};

export default function EditingDialog({ item, index, open, onOpenChange }) {
    const type = item?.result?.other?.type;
    const FormComponent = item ? map[type] : null;

    useEffect(() => {
        if (open && item && !FormComponent) {
            toast.error(`Неизвестный тип позиции: ${type}`);
            onOpenChange(false);
        }
    }, [open, item, FormComponent, type, onOpenChange]);

    if (!item || !FormComponent) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="min-w-max gap-0">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-base mb-4 text-[18px] font-semibold">
                        Редактирование позиции {index + 1}
                    </DialogTitle>
                </DialogHeader>

                <FormComponent dv={item.initialData} editingIndex={index} onOpenChange={onOpenChange}/>
            </DialogContent>
        </Dialog>
    );
}