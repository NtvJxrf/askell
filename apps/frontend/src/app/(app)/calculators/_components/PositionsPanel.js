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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown } from 'lucide-react';
import simulation from '@askell/shared/calc/simulation';
import triplexCalc from '@askell/shared/calc/triplex';
import { calculateMaterialLayouts, getCuttingAllowance } from '@/app/(app)/cuttingLayouts/cuttingLayouts';
import { POSITION_CALCULATORS } from './positionCalculators';
import { exportPositionsToExcel, importPositionsFromExcel } from './excelPositions';
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

// Типы позиций, чьи детали реально вырезаются из листовых материалов —
// только для них строится раскладка на листе и считается % обрези.
const CUTTING_LAYOUT_TYPES = ['Стекло', 'Триплекс', 'Стеклопакет'];

// Материалы позиции: одиночное поле `material` (Стекло/СМД) либо набор полей
// `material1`, `material2`, ... (Триплекс/Стеклопакет).
function getPositionMaterials(initialData) {
  if (!initialData) return [];
  if (initialData.material) return [initialData.material];
  return Object.entries(initialData)
    .filter(([key, value]) => key.startsWith('material') && value)
    .map(([, value]) => value);
}

// Стеклопакет хранит использованный при расчёте триплекс отдельным объектом
// (result.other.usedTriplex) — его тоже нужно пересчитать с новым % обрези
// перед пересчётом самого стеклопакета.
function recalculateUsedTriplex(usedTriplex, selfcost, trims) {
  return (usedTriplex || []).map((triplex) => {
    try {
      const data = { ...triplex.initialData, quantity: triplex.quantity || 1, trims };
      return { ...triplex, ...triplexCalc(data, selfcost) };
    } catch (error) {
      console.error(error);
      return triplex;
    }
  });
}

function recalculatePosition(position, selfcost, trims) {
  const type = position?.result?.other?.type;
  const calc = POSITION_CALCULATORS[type];
  if (!calc) return position;
  try {
    const quantity = position.quantity || position.initialData?.quantity || 1;
    const data = { ...position.initialData, quantity, trims };
    const next = type === 'Стеклопакет'
      ? calc(data, selfcost, recalculateUsedTriplex(position.result?.other?.usedTriplex, selfcost, trims))
      : calc(data, selfcost);
    return { ...position, ...next, key: position.key, quantity: position.quantity, added: false };
  } catch (error) {
    console.error(error);
    toast.error(`Ошибка пересчёта позиции: ${position?.name || position?.key}`);
    return position;
  }
}

export function PositionsPanel() {
  const orderNameRef = useRef(null);
  const excelFileInputRef = useRef(null);
  const dispatch = useDispatch();
  const order = useSelector((state) => state.app.currentOrder);
  const displayPrice = useSelector((state) => state.app.displayPrice);
  const positions = useSelector((state) => state.app.positions);
  const [disabled, setDisabled] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
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
      const { order, positions } = await backend(`/sklad/order?name=${name}`);
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
    try{
      const response = await backend(`/sklad/saveOrder`, {
        method: 'POST',
        body: {positions, order, displayPrice, planDate: { workingDays: 12}}
      });
    }catch(err){
      console.error(err)
      toast.error(`Ошибка: ${err.message || String(err)}`);
    }
  }
  const handleDeleteSelected = () => {
    const unselectedPositions = positions.filter((p) => !p.selected);
    dispatch(setPositions(unselectedPositions));
  }
  const handlePackage = () => {
    toast.success('Функция упаковки пока не реализована');
  }
  const handleRecalculateTrim = (withLayout) => {
    const rawPositions = store.getState().app.positions;
    const selfcost = store.getState().app.selfcost;
    if (!rawPositions.length) {
      toast.error('Нет позиций');
      return;
    }
    if (!selfcost?.materials) {
      toast.error('Себестоимость не загружена');
      return;
    }
    let trims = {};
    if (withLayout) {
      const piecesByMaterial = {};
      rawPositions.forEach((position, index) => {
        const type = position?.result?.other?.type;
        if (!CUTTING_LAYOUT_TYPES.includes(type)) return;
        const { width, height } = position.initialData || {};
        if (!width || !height) return;
        const quantity = position.quantity || position.initialData?.quantity || 1;
        getPositionMaterials(position.initialData).forEach((material) => {
          if (!material) return;
          if (!piecesByMaterial[material]) piecesByMaterial[material] = [];
          const allowance = getCuttingAllowance(material);
          piecesByMaterial[material].push({
            id: `${position.key || index}-${material}`,
            width: Number(width) + allowance,
            height: Number(height) + allowance,
            quantity: Number(quantity) || 1,
          });
        });
      });
      const { trims: computedTrims, errors } = calculateMaterialLayouts(piecesByMaterial, selfcost.materials);
      trims = computedTrims;
      Object.keys(errors).forEach((material) => toast.error(`Не удалось рассчитать обрезь для материала: ${material}`));
    }
    const recalculated = rawPositions.map((position) => recalculatePosition(position, selfcost, trims));
    dispatch(setPositions(recalculated));
    toast.success(withLayout ? 'Обрезь пересчитана с раскладкой' : 'Обрезь пересчитана с базовым %');
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
    const positions = store.getState().app.positions
    console.log('positions', positions)
    const pricesAndCoefs = store.getState().app?.selfcost?.pricesAndCoefs
    const stages = store.getState().app?.selfcost?.processingStages
    const heaps = JSON.parse(JSON.stringify(origHeaps))
    console.log('heaps', JSON.parse(JSON.stringify(heaps)))
    for(const pos of positions){
      const posType = pos?.result?.other?.type
      console.log(pos, posType)
      if(posType == 'Стекло'){
          for (let i = 0; i < pos.quantity; i++) {
              heaps?.['Раскрой']?.push({
                  name: pos?.name,
                  // attributes: attrs,
                  // deliveryPlannedMoment: order.deliveryPlannedMoment,
                  productionPath: buildGlassPath(pos),
                  orderingPosition: 0,
                  tier: 3
              });
          }
      }
      if(posType == 'Триплекс'){
          for (let i = 0; i < pos.quantity; i++) {
              const obj = {
                  name: pos?.name,
                  // attributes: attrs,
                  // deliveryPlannedMoment: order.deliveryPlannedMoment,
                  productionPath: [{stageName: 'Триплексование', orderingPosition: 0, materials: {}}, {stageName: 'ОТК', orderingPosition: 1}],
                  orderingPosition: 0,
                  tier: 3,
              }
              for(let i = 0; i < (pos?.result?.other?.materials?.length || 2); i++) {
                  const assortmentId = crypto.randomUUID();
                  heaps?.['Раскрой']?.push({//Раскрой
                      name: `Стекло для ${pos?.name}`,
                      // attributes: attrs,
                      // deliveryPlannedMoment: order.deliveryPlannedMoment,
                      productionPath: buildGlassPath(pos),
                      orderingPosition: 0,
                      tier: 3,
                      assortmentId
                  });
                  obj.productionPath[0].materials[assortmentId] ??= 0
                  obj.productionPath[0].materials[assortmentId] += 1
              }
              heaps?.['Триплексование']?.push(obj)//Триплексование
          }
      }
      if(posType == 'Стеклопакет'){
        for (let i = 0; i < pos.quantity; i++) {
          const obj = {
              name: pos?.name,
              // attributes: attrs,
              // deliveryPlannedMoment: order.deliveryPlannedMoment,
              productionPath: [
                  {stageName: 'Изготовление рамки', orderingPosition: 0, materials: {}},
                  {stageName: 'Сборка стеклопакета', orderingPosition: 1},
                  {stageName: 'Вторичная герметизация', orderingPosition: 2}
              ],
              orderingPosition: 0,
              tier: 3
          }
          for(const material of (pos?.result?.other?.materials || [])) {
              const assortmentId = crypto.randomUUID();
              heaps?.['Раскрой']?.push({//Раскрой
                  name: `Стекло для ${pos?.name}`,
                  // attributes: attrs,
                  // deliveryPlannedMoment: order.deliveryPlannedMoment,
                  productionPath: buildGlassPathForGlasspacket(pos, material),
                  orderingPosition: 0,
                  tier: 3,
                  assortmentId
              });
              obj.productionPath[0].materials[assortmentId] ??= 0
              obj.productionPath[0].materials[assortmentId] += 1
          }
          heaps?.['Изготовление рамки']?.push(obj)//Изготовление рамки
        }
      }
    }
    console.log('heaps', JSON.parse(JSON.stringify(heaps)))
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
  const handleExcelImport = () => {
    excelFileInputRef.current?.click();
  }
  const handleExcelFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const selfcost = store.getState().app.selfcost;
    const triplexArray = store.getState().app.triplexArray;
    if (!selfcost?.materials) {
      toast.error('Себестоимость не загружена');
      return;
    }
    setDisabled(true);
    try {
      const result = await importPositionsFromExcel(file, selfcost, triplexArray);
      if (result.positions.length) dispatch(addPositions(result.positions));
      setImportSummary(result);
    } catch (error) {
      console.error(error);
      toast.error(`Ошибка чтения файла: ${error.message || String(error)}`);
    } finally {
      setDisabled(false);
    }
  }
  const handleExcelExport = async () => {
    try {
      const { count, skipped } = await exportPositionsToExcel(positions);
      if (count === 0) {
        toast.error('Нет позиций с известным типом калькулятора для экспорта');
        return;
      }
      toast.success(`Экспортировано позиций: ${count}${skipped ? `, пропущено: ${skipped}` : ''}`);
    } catch (error) {
      console.error(error);
      toast.error(`Ошибка экспорта: ${error.message || String(error)}`);
    }
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
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="outline">Пересчитать обрезь</Button>
          }>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-start gap-0.5 text-[14px] px-0.5">
            <Button size="sm" variant="ghost" onClick={() => handleRecalculateTrim(true)}>С раскладкой</Button>
            <Button size="sm" variant="ghost" onClick={() => handleRecalculateTrim(false)}>С базовым %</Button>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="outline">Excel</Button>
          }>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-start gap-0.5 text-[14px] px-0.5">
            <Button size="sm" variant="ghost" onClick={handleExcelImport}>Загрузить из Excel</Button>
            <Button size="sm" variant="ghost" onClick={handleExcelExport}>Выгрузить в Excel</Button>
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

      <input
        type="file"
        accept=".xlsx,.xls"
        ref={excelFileInputRef}
        onChange={handleExcelFileSelected}
        className="hidden"
      />
      <ImportSummaryDialog summary={importSummary} onOpenChange={(open) => !open && setImportSummary(null)} />
    </div>
  );
}

function ImportSummaryDialog({ summary, onOpenChange }) {
  return (
    <Dialog open={!!summary} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Импорт позиций из Excel</DialogTitle>
        </DialogHeader>
        {summary && (
          <div className="flex flex-col gap-2 overflow-y-auto text-[13px]">
            <span>Всего строк: {summary.total}</span>
            <span className="text-green-600">Добавлено: {summary.added}</span>
            <span className="text-orange-400">Пропущено (нет/неизвестен calcType): {summary.skipped}</span>
            <span className={summary.errors.length ? 'text-red-500' : ''}>Ошибок: {summary.errors.length}</span>
            {summary.errors.length > 0 && (
              <div className="flex flex-col gap-1 rounded border p-2">
                {summary.errors.map((err, index) => (
                  <span key={index}>Строка {err.row}{err.calcType ? ` (${err.calcType})` : ''}: {err.message}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatPrice(price) {
  if (price == null) return '—';
  return `${(price).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
}
const buildGlassPath = (data) => {
  const path = ['Раскрой']
  if(data.initialData.processing == 'Притупка') path.push('ПР Притупка')
  if(data.initialData.processing == 'Полировка' && data.result.other.stanok == 'Прямолинейка') path.push('ПР Полировка')
  if(data.initialData.processing == 'Шлифовка' && data.result.other.stanok == 'Прямолинейка') path.push('ПР Шлифовка')
  if(data.initialData.processing == 'Полировка' && data.result.other.stanok == 'Криволинейка') path.push('КР Полировка')
  if(data.initialData.processing == 'Шлифовка' && data.result.other.stanok == 'Криволинейка') path.push('КР Шлифовка')
  if(data.initialData.drills > 0) path.push('Сверление')
  if(data.initialData.zenk > 0) path.push('Зенковка')
  if(data.initialData.tempered) path.push('Закалка')
  path.push('ОТК')
  const res = path.map((stageName, index) => {
    return {
      stageName,
      orderingPosition: index
    }
  })
  return res
}
const buildGlassPathForGlasspacket = (pos, material) => {
  const path = ['Раскрой']
  if(material[2] == 'Притупка') path.push('ПР Притупка')
  if(material[2] == 'Полировка' && pos.result.other.stanok == 'Прямолинейка') path.push('ПР Полировка')
  if(material[2] == 'Шлифовка' && pos.result.other.stanok == 'Прямолинейка') path.push('ПР Шлифовка')
  if(material[2] == 'Полировка' && pos.result.other.stanok == 'Криволинейка') path.push('КР Полировка')
  if(material[2] == 'Шлифовка' && pos.result.other.stanok == 'Криволинейка') path.push('КР Шлифовка')
  if(material[1]) path.push('Закалка')
  if(material[3]) path.push('Окрашивание')
  path.push('ОТК')
  const res = path.map((stageName, index) => {
    return {
      stageName,
      orderingPosition: index
    }
  })
  return res
}