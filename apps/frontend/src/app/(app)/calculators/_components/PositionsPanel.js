'use client';

import { Button } from '@/components/Button';
import { Divider } from '@/components/Divider';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { backend } from '@/lib/backend';
// Right-side panel (~60%): order/positions management. Currently a structural
// scaffold — search bar, order meta, an action button row, a positions info
// block and an empty positions table. Handlers are stubs to be wired later.

const TABLE_COLUMNS = ['№', 'Название', 'Цена', 'Создано', 'Кол-во'];

// Shared column template so the header and (future) rows line up.
const TABLE_GRID = 'grid grid-cols-[3rem_minmax(0,1fr)_6rem_9rem_5rem]';

const ACTION_BUTTONS = Array.from({ length: 8 }, (_, i) => ({
  id: `action-${i + 1}`,
  label: `Кнопка ${i + 1}`,
}));

export function PositionsPanel() {
  const handleSearch = async () => {
    const order = await backend('/orders/order', { params: { name: 'test' } });

    console.log(order);
  };

  const handleReset = () => {
    console.log('reset search');
  };

  const handleAction = (id) => {
    console.log('action', id);
  };

  const inputClass = 'rounded-md border border-black/[.12] bg-transparent px-3 py-0.5 text-[13px] outline-none transition-colors focus:border-violet-500 dark:border-white/[.18] dark:focus:border-violet-400';
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          size={8}
          placeholder="№ заказа"
          className={inputClass}
        />
        <Button variant="primary" onClick={handleSearch}>
          Найти
        </Button>
        <Button onClick={handleReset}>Сбросить</Button>
      </div>

      {/* Order meta (single row) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-zinc-600 dark:text-zinc-400">
        <span>
          Номер заказа: <span className="text-zinc-900 dark:text-zinc-100">—</span>
        </span>
        <span>
          Контрагент: <span className="text-zinc-900 dark:text-zinc-100">—</span>
        </span>
        <span>
          Создано: <span className="text-zinc-900 dark:text-zinc-100">—</span>
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {ACTION_BUTTONS.map((btn) => (
          <Button key={btn.id} onClick={() => handleAction(btn.id)}>
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Positions info block */}
      <div className="py-2 text-[13px] text-zinc-500 dark:text-zinc-400">
        Информация о позициях появится здесь
      </div>

      {/* Positions table */}
      <div className="min-h-0 flex-1 overflow-auto">
        {/* Column headers, centered, with a vertical Divider between each */}
        <div className={`${TABLE_GRID} text-[13px] font-medium text-zinc-500 dark:text-zinc-400`}>
          {TABLE_COLUMNS.map((col, i) => (
            <div key={col} className="relative flex items-center justify-center py-2 text-center">
              {i > 0 && <Divider className="absolute inset-y-0 left-0" />}
              {col}
            </div>
          ))}
        </div>

        {/* Big divider between the headers and the table content */}
        <Divider orientation="horizontal" />

        {/* Body placeholder */}
        <div className="px-3 py-6 text-center text-[13px] text-zinc-400 dark:text-zinc-500">
          Нет позиций
        </div>
      </div>
    </div>
  );
}
