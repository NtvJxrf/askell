'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { setAllPositionsSelected } from '@/lib/slice';
import { PositionsRow } from './PositionsRow';

// Data column labels (the leading control columns — actions / select / drag —
// are intentionally label-less).
const TABLE_COLUMNS = ['№', 'Название', 'Цена', 'Создано', 'Кол-во'];

// Stable key for a position: prefer its id, fall back to the array index.
const keyOf = (position, index) => position?.id ?? index;

export function PositionsTable() {
  const dispatch = useDispatch();
  const positions = useSelector((state) => state.app.positions);
  // Drag-and-drop tracking: source row and the row currently hovered over.
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  // Selection lives in the slice (on each position), so other parts of the app
  // can read/act on the selected positions.
  const allSelected = positions.length > 0 && positions.every((p) => p.selected);
  const someSelected = positions.some((p) => p.selected);

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragEnter = (index) => setOverIndex(index);
  const resetDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {/* Fixed layout so header and rows share identical column widths. The
          leading three columns are row controls (actions, select, drag), the
          "Название" column flexes, the rest are sized to their content. */}
      <Table className="table-fixed text-[13px]">
        <colgroup>
          <col className="w-8" />
          <col className="w-8" />
          <col className="w-8" />
          <col className="w-12" />
          <col />
          <col className="w-24" />
          <col className="w-[4.5rem]" />
          <col className="w-20" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* Control columns: empty actions cell, select-all checkbox, empty drag cell */}
            <TableHead aria-hidden className="h-9 p-0" />
            <TableHead className="h-9 p-0">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={(checked) => dispatch(setAllPositionsSelected(checked === true))}
                  disabled={positions.length === 0}
                  aria-label="Выделить все позиции"
                />
              </div>
            </TableHead>
            <TableHead aria-hidden className="h-9 p-0" />
            {TABLE_COLUMNS.map((col) => (
              <TableHead
                key={col}
                className="h-9 text-center font-medium text-muted-foreground"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={8}
                className="py-6 text-center text-muted-foreground"
              >
                Нет позиций
              </TableCell>
            </TableRow>
          ) : (
            positions.map((position, index) => {
              const key = keyOf(position, index);
              return (
                <PositionsRow
                  key={key}
                  position={position}
                  index={index}
                  isDragging={dragIndex === index}
                  isOver={overIndex === index && dragIndex !== index}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  dragIndex={dragIndex}
                  onDragEnd={resetDrag}
                />
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
