'use client';

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    ChevronRight,
    GripVertical,
    Trash2,
    Pencil,
    Info,
    Check,
    X
} from 'lucide-react';
import {
  removePosition,
  reorderPositions,
  togglePositionSelected,
  setPositionQuantity,
} from '@/lib/slice';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Format a kopeck price into a tidy "1 234,56 ₽" string.
function formatPrice(price) {
  if (price == null) return '—';
  return `${(price).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
}

export function PositionsRow({
    position,
    index,
    isDragging,
    isOver,
    onDragStart,
    onDragEnter,
    dragIndex,
    onDragEnd,
    currentPrice,
    setDetailsItem
}) {
    const dispatch = useDispatch();
    // Dragging is only enabled while the user holds the grip handle, so plain
    // clicks elsewhere on the row never start a drag.
    const [dragEnabled, setDragEnabled] = useState(false);

    const name = position?.name ?? position?.assortment?.name ?? '—';

    const handleDelete = () => dispatch(removePosition(index));

    const price = position.prices?.[currentPrice] ?? 0;
    const discount = position.discount ?? 0;
    const cost = position?.result?.other?.calcmaterialsandworks ?? 0;

    const finalPrice = price * (1 - discount / 100);
    const profit = finalPrice - cost;

    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

    const handleEditing = () => {
        console.log('editing', position);
    };
    return (
        <TableRow
            draggable={dragEnabled}
            data-state={position?.selected ? 'selected' : undefined}
            onDragStart={() => onDragStart(index)}
            onDragEnter={() => onDragEnter(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                if (dragIndex != null && dragIndex !== index) {
                dispatch(reorderPositions({ from: dragIndex, to: index }));
                }
                onDragEnd();
            }}
            onDragEnd={() => {
                setDragEnabled(false);
                onDragEnd();
            }}
            className={['text-[13px]', isDragging ? 'opacity-40' : '', isOver ? 'shadow-[inset_0_2px_0_0_#8b5cf6]' : '',]
                .filter(Boolean)
                .join(' ')}
        >
        {/* Actions: click the chevron to open the row menu */}
        <TableCell className="p-1">
            <div className="flex items-center justify-center">
                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label="Действия"
                        className="flex size-5 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
                    >
                        <ChevronRight className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="start" sideOffset={6} className="min-w-40">
                        <DropdownMenuItem onClick={handleEditing}>
                            <Pencil className="size-3.5" />
                            Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDetailsItem(position)}>
                            <Info className="size-3.5" />
                            Подробнее
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                            <Trash2 className="size-3.5" />
                            Удалить
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </TableCell>

        {/* Select */}
        <TableCell className="p-1">
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={Boolean(position?.selected)}
                    onCheckedChange={() => dispatch(togglePositionSelected(index))}
                    aria-label="Выделить позицию"
                />
            </div>
        </TableCell>

        {/* Drag handle */}
        <TableCell className="p-1 text-center">
            <button
                type="button"
                aria-label="Перетащить"
                onMouseDown={() => setDragEnabled(true)}
                onMouseUp={() => setDragEnabled(false)}
                className="inline-flex size-5 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
            >
                <GripVertical className="size-3.5" />
            </button>
        </TableCell>

        {/* № */}
        <TableCell className="p-1.5 text-center">{index + 1}</TableCell>

        {/* Название */}
        <TableCell className="px-2 py-1.5">
            <span className="block truncate" title={name}>
                {name}
            </span>
        </TableCell>

        {/* Цена */}
        <TableCell className="relative text-center">
            <span>
                {formatPrice(finalPrice || 0)}
            </span>

            {discount > 0 && (
                <span className="absolute right-0 top-0 text-[10px] font-semibold text-orange-400" title={`Скидка: ${discount}%`}>
                    -{discount}%
                </span>
            )}

            <span className="absolute left-0 bottom-0 text-[10px] font-semibold text-green-600" title={`Прибыль: ${profitPercent.toFixed(1)}%`}>
                {profit > 0 ? "+" : ""}
                {formatPrice(profit)} ({profitPercent.toFixed(1)}%)
            </span>
        </TableCell>

        {/* Создано */}
        <TableCell className="p-1.5">
            <div className="flex items-center justify-center">
                {position?.added ? (
                    <Check className="size-4 text-emerald-500" />
                ) : (
                    <X className="size-4 text-red-500" />
                )}
            </div>
        </TableCell>

        {/* Кол-во */}
        <QuantityCell index={index} value={position?.quantity} />
        </TableRow>
    );
}

// Quantity cell: the typed value is held in local state so editing it does NOT
// re-render the whole positions list on every keystroke. The slice is only
// updated on blur / Enter (when the value actually changed).
function QuantityCell({ index, value }) {
    const dispatch = useDispatch();
    const [draft, setDraft] = useState(value ?? '');

    // Re-sync when the underlying position changes externally (e.g. reordering
    // shifts a different position into this index).
    useEffect(() => {
        setDraft(value ?? '');
    }, [value]);

    const commit = () => {
        const trimmed = String(draft).trim();

        let next = Number(trimmed);

        // если пусто или не число — возвращаем текущее значение
        if (trimmed === '' || Number.isNaN(next)) {
            setDraft(String(value));
            return;
        }

        // ограничиваем минимум и максимум
        next = Math.min(9999, Math.max(1, next));

        if (next === value) return;

        dispatch(setPositionQuantity({ index, quantity: next }));
        setDraft(String(next));
    };

    const handleChange = (e) => {
        const next = e.target.value;
        if (next === '' || (Number(next) >= 1 && Number(next) <= 9999)) {
            setDraft(next);
        }
    };
    return (
        <TableCell className="p-1.5 text-center">
            <Input
                type="number"
                min={1}
                max={9999}
                inputMode="numeric"
                value={draft}
                onChange={handleChange}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                }}
                aria-label="Количество"
                className="mx-auto h-7 w-15 px-1.5 text-center text-[13px]"
            />
        </TableCell>
    );
}
