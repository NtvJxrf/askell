'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { backend } from '@/lib/backend';
import { setOrder } from '@/lib/slice';
import { PositionsTable } from './PositionsTable';
import { store, setPositions, setDisplayPrice, addPositions } from '@/lib/slice';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown } from 'lucide-react';
import trimCalc  from '@askell/shared/calc/trimCalc';
import simulation from '@askell/shared/calc/simulation';
// Right-side panel (~60%): order/positions management. Currently a structural
// scaffold — search bar, order meta, an action button row, a positions info
// block and the positions table. Handlers are stubs to be wired later.
const priceItems = {
  gostPrice: 'Выше госта',
  retailPrice: 'Розница',
  bulkPrice: 'Опт',
  dealerPrice: 'Дилер',
  vipPrice: 'ВИП'
};

export function PositionsPanel() {
  const orderNameRef = useRef(null);
  const dispatch = useDispatch();
  const order = useSelector((state) => state.app.currentOrder);
  const displayPrice = useSelector((state) => state.app.displayPrice);
  const positions = useSelector((state) => state.app.positions);
  const [disabled, setDisabled] = useState(false);
  const positionsInfo = useMemo(() => {
    return positions.reduce(
      (acc, position) => {
        const { prices, quantity = 1, discount = 0 } = position;

        const discountFactor = 1 - discount / 100;

        acc.totalPrices.gostPrice += (prices?.gostPrice || 0) * quantity * discountFactor;
        acc.totalPrices.retailPrice += (prices?.retailPrice || 0) * quantity * discountFactor;
        acc.totalPrices.bulkPrice += (prices?.bulkPrice || 0) * quantity * discountFactor;
        acc.totalPrices.dealerPrice += (prices?.dealerPrice || 0) * quantity * discountFactor;
        acc.totalPrices.vipPrice += (prices?.vipPrice || 0) * quantity * discountFactor;

        acc.totalDiscount += (prices?.[displayPrice] || 0) * quantity * (discount / 100);

        const cost = (position?.result?.other?.calcmaterialsandworks || 0) * quantity;

        acc.cost += cost;

        acc.totalProfit += (prices?.[displayPrice] || 0) * quantity * discountFactor - cost;
        acc.totalWeight += (position?.result?.other?.weight || 0) * quantity;
        acc.totalS += (position?.result?.other?.S || 0) * quantity;
        acc.totalP += (position?.result?.other?.P || 0) * quantity;

        return acc;
      },
      {
        totalPrices: {
          gostPrice: 0,
          retailPrice: 0,
          bulkPrice: 0,
          dealerPrice: 0,
          vipPrice: 0,
        },
        totalDiscount: 0,
        totalProfit: 0,
        cost: 0,
        totalWeight: 0,
        totalS: 0,
        totalP: 0,
      }
    );
  }, [positions, displayPrice]);
  console.log(positionsInfo)
  const handleSearch = async () => {
    const name = orderNameRef.current;
    if (!name) return;
    setDisabled(true);
    try{
      const { order, positions } = await backend(`/orders/order?name=${name}`);
      dispatch(setOrder(order));
      dispatch(addPositions(positions));
    } finally {
      toast.success(`Заказ ${name} загружен`);
      setDisabled(false); 
    }
  };
  const handleReset = () => {
    dispatch(setOrder(null));
    dispatch(setPositions([]));
  };
  const handleSave = async () => {
    const positions = store.getState().app.positions;
    const order = store.getState().app.currentOrder;
    if (!order) return;
    const response = await backend(`/orders/saveOrder`, {
      method: 'POST',
      body: {positions, order, displayPrice, planDate: { workingDays: 12}}
    });
  }
  const handleDeleteSelected = () => {
    const unselectedPositions = positions.filter((p) => !p.selected);
    dispatch(setPositions(unselectedPositions));
  }
  const handlePackage = () => {
    toast.success('Функция упаковки пока не реализована');
  }
  const handleRecalcDeadline = () => {
    toast.success('Функция пересчета срока пока не реализована');
    const origHeaps = store.getState().app.heaps
    if(Object.keys(origHeaps).length === 0) {
      toast.error('Нет данных о текущей загрузке, либо они еще не загрузились');
      return;
    }
    console.time('simulation')
    const { schedule, index } = store.getState().app.schedule
    const pricesAndCoefs = store.getState().app?.selfcost?.pricesAndCoefs
    const stages = store.getState().app?.selfcost?.processingStages
    const heaps = JSON.parse(JSON.stringify(origHeaps))
    console.log({
      schedule,
      startIndex: index,
      heaps,
      pricesAndCoefs,
      stages
    })
    const res = simulation({
      schedule,
      startIndex: index,
      heaps,
      pricesAndCoefs,
      stages
    })
    console.log(res)
    console.timeEnd('simulation')
  }
  const ACTION_BUTTONS = [
    { id: 'save', label: 'Сохранить', action: handleSave },
    { id: 'deleteSelected', label: 'Удалить выделенное', action: handleDeleteSelected },
    { id: 'package', label: 'Упаковка', action: handlePackage },
    { id: 'recalcDeadline', label: 'Пересчитать срок', action: handleRecalcDeadline },
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
      {/* Order meta (order name, agent, moment) */}
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
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="outline">Тип цен: {priceItems[displayPrice]}</Button>
              }>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex flex-col items-start gap-0.5 text-[14px] px-0.5">
                <Button size="sm" variant="ghost" onClick={() => dispatch(setDisplayPrice('gostPrice'))}>Выше госта (Повышенное требование)</Button>
                <Button size="sm" variant="ghost" onClick={() => dispatch(setDisplayPrice('retailPrice'))}>Розница (Менее 200тыс.)</Button>
                <Button size="sm" variant="ghost" onClick={() => dispatch(setDisplayPrice('bulkPrice'))}>Опт (Более 200тыс.)</Button>
                <Button size="sm" variant="ghost" onClick={() => dispatch(setDisplayPrice('dealerPrice'))}>Дилер (Более 400тыс.)</Button>
                <Button size="sm" variant="ghost" onClick={() => dispatch(setDisplayPrice('vipPrice'))}>ВИП (Более 800тыс.)</Button>
              </TooltipContent>
            </Tooltip>
      </div>
      {/* Positions info block (tooltips) */}
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="outline">
              Деньги 
              <ChevronDown />
            </Button>
          }>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-start gap-1 text-[14px]">
            <span>Выше госта: {formatPrice(positionsInfo.totalPrices.gostPrice)}</span>
            <span>Розница: {formatPrice(positionsInfo.totalPrices.retailPrice)}</span>
            <span>Опт: {formatPrice(positionsInfo.totalPrices.bulkPrice)}</span>
            <span>Дилер: {formatPrice(positionsInfo.totalPrices.dealerPrice)}</span>
            <span>ВИП: {formatPrice(positionsInfo.totalPrices.vipPrice)}</span>
            <span>Затраты: {formatPrice(positionsInfo.cost)}</span>
            <span className="text-green-600">Прибыль: {formatPrice(positionsInfo.totalProfit)} ({((positionsInfo.totalProfit / positionsInfo.cost) * 100 || 0).toFixed(2)}%)</span>
            <span className="text-orange-400">Сумма скидки: {formatPrice(positionsInfo.totalDiscount)}</span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="outline">
              Сроки 
              <ChevronDown />
            </Button>
          }>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-start gap-1 text-[14px]">
            <span>Тут будут сроки</span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="outline">
              Параметры 
              <ChevronDown />
            </Button>
          }>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-start gap-1 text-[14px]">
            <span>Площадь: {positionsInfo.totalS.toFixed(2)} м²</span>
            <span>Периметр: {positionsInfo.totalP.toFixed(2)} м.п.</span>
            <span>Вес: {positionsInfo.totalWeight.toFixed(2)} кг</span>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Positions table */}
      <PositionsTable />
    </div>
  );
}

function formatPrice(price) {
  if (price == null) return '—';
  return `${(price).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
}