'use client';

import { useLayoutEffect, useRef, useState } from 'react';
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
import DetailsDialog from './DetailsDialog.js';
import EditingDialog from './EditingDialog.js';
// Data column labels (the leading control columns — actions / select / drag —
// are intentionally label-less).
const TABLE_COLUMNS = ['№', 'Название', 'Цена', 'Создано', 'Кол-во'];

// Stable key for a position: prefer its id, fall back to the array index.
const keyOf = (position, index) => position?.id ?? index;

export function PositionsTable() {
  const dispatch = useDispatch();
  const positions = useSelector((state) => state.app.positions);
  const currentPrice = useSelector((state) => state.app.displayPrice);
  const [detailsItem, setDetailsItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [touchedIndex, setTouchedIndex] = useState(null);
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

  // Names are long and get truncated in their column, so instead of ellipsis
  // we let the whole "Название" column scroll horizontally in sync via a
  // single scrollbar embedded in the column header. `nameOffset` is the
  // shared scroll position (px) applied to every row's name text.
  const measureRef = useRef(null);
  const nameScrollRef = useRef(null);
  const [maxNameWidth, setMaxNameWidth] = useState(0);
  const [nameOffset, setNameOffset] = useState(0);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    let max = 0;
    for (const position of positions) {
      const name = position?.name ?? position?.assortment?.name ?? '—';
      el.textContent = name;
      if (el.offsetWidth > max) max = el.offsetWidth;
    }
    setMaxNameWidth(max);

    // Clamp the current scroll position if the content got shorter (e.g.
    // positions were removed/filtered) so the column doesn't stay scrolled
    // past the new end.
    const track = nameScrollRef.current;
    if (track) {
      const maxScroll = Math.max(0, max - track.clientWidth);
      if (track.scrollLeft > maxScroll) {
        track.scrollLeft = maxScroll;
      }
    }
  }, [positions]);

  const handleNameScroll = (e) => setNameOffset(e.currentTarget.scrollLeft);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table className="table-fixed text-[13px]">
        <colgroup>
          <col className="w-8" />
          <col className="w-8" />
          <col className="w-8" />
          <col className="w-12" />
          <col className="min-w-24"/>
          <col className="w-24" />
          <col className="w-[4.5rem]" />
          <col className="w-20" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
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
            {TABLE_COLUMNS.map((col) =>
              col === 'Название' ? (
                <TableHead
                  key={col}
                  className="h-9 p-1 text-center font-medium text-muted-foreground"
                >
                  <div className="flex h-full flex-col justify-center gap-1">
                    <span className="truncate">{col}</span>
                    <div
                      ref={nameScrollRef}
                      onScroll={handleNameScroll}
                      role="scrollbar"
                      aria-label="Прокрутка названий"
                      aria-orientation="horizontal"
                      className="h-2.5 overflow-x-auto overflow-y-hidden rounded-full [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-track]:bg-transparent"
                    >
                      <div style={{ width: maxNameWidth || '100%', height: 1 }} />
                    </div>
                  </div>
                </TableHead>
              ) : (
                <TableHead
                  key={col}
                  className="h-9 text-center font-medium text-muted-foreground"
                >
                  {col}
                </TableHead>
              )
            )}
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
                  currentPrice={currentPrice}
                  nameOffset={nameOffset}
                  setDetailsItem={setDetailsItem}
                  setEditingItem={setEditingItem}
                  setTouchedIndex={setTouchedIndex}
                />
              );
            })
          )}
        </TableBody>
      </Table>
      {/* Off-screen span used only to measure the pixel width of each name
          with the same font as the real cells, so the scrollbar's range
          matches the longest name. */}
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute -left-[9999px] top-0 whitespace-nowrap px-2 text-[13px]"
      />
      <DetailsDialog item={detailsItem} index={touchedIndex} open={Boolean(detailsItem)} onOpenChange={(open) => {if (!open) { setDetailsItem(null); setTouchedIndex(null); }}}/>
      <EditingDialog item={editingItem} index={touchedIndex} open={Boolean(editingItem)} onOpenChange={(open) => {if (!open) { setEditingItem(null); setTouchedIndex(null); }}}/>
    </div>
  );
}
