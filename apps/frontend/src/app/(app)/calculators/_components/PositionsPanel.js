'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { backend } from '@/lib/backend';
import { setOrder } from '@/lib/slice';
import { PositionsTable } from './PositionsTable';
import { store, setPositions } from '@/lib/slice';
import { toast } from 'sonner';
// Right-side panel (~60%): order/positions management. Currently a structural
// scaffold — search bar, order meta, an action button row, a positions info
// block and the positions table. Handlers are stubs to be wired later.


export function PositionsPanel() {
  const orderNameRef = useRef(null);
  const dispatch = useDispatch();
  const order = useSelector((state) => state.app.currentOrder);
  const [disabled, setDisabled] = useState(false);

  const handleSearch = async () => {
    const name = orderNameRef.current;
    if (!name) return;
    setDisabled(true);
    try{
      const { order, positions } = await backend(`/orders/order?name=${name}`);
      dispatch(setOrder(order));
      dispatch(setPositions(positions));
    } finally {
      toast.success(`Заказ ${name} загружен`);
      setDisabled(false); 
    }
  };

  const handleReset = () => {
    dispatch(setOrder(null));
  };

  const handleSave = async () => {
    const positions = store.getState().app.positions;
    const order = store.getState().app.currentOrder;
    if (!order) return;
    const response = await backend(`/orders/saveOrder`, {
      method: 'POST',
      body: {positions, order, displayPrice: 'retailPrice', planDate: { workingDays: 12}}
    });
    console.log(response)
  }
  const handleDeleteSelected = () => {
    const unselectedPositions  = store.getState().app.positions.filter((p) => !p.selected);
    if (unselectedPositions .length === 0) return;
    dispatch(setPositions(unselectedPositions ));
  }
  const ACTION_BUTTONS = [
    { id: 'save', label: 'Сохранить', action: handleSave },
    { id: 'deleteSelected', label: 'Удалить выделенное', action: handleDeleteSelected },
  ];
  console.log('render positions')
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="№ заказа"
          className="w-32"
          onChange={(e) => { orderNameRef.current = e.target.value }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
        />
        <Button onClick={handleSearch} disabled={disabled}>
          Найти
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={disabled}>Сбросить</Button>
      </div>

      {/* Order meta (single row) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-zinc-600 dark:text-zinc-400">
        <span>
          № заказа: <span className="text-zinc-900 dark:text-zinc-100">{order?.name ?? '—'}</span>
        </span>
        <span>
          Контрагент: <span className="text-zinc-900 dark:text-zinc-100">{order?.agent ?? '—'}</span>
        </span>
        <span>
          Создано: <span className="text-zinc-900 dark:text-zinc-100">{order?.moment ? new Date(order.moment).toLocaleDateString() : '—'}</span>
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {ACTION_BUTTONS.map((btn) => (
          <Button key={btn.id} variant="outline" onClick={() => btn.action?.()} disabled={disabled}>
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Positions info block */}
      <div className="py-2 text-[13px] text-zinc-500 dark:text-zinc-400">
        Информация о позициях появится здесь
      </div>

      {/* Positions table */}
      <PositionsTable />
    </div>
  );
}
