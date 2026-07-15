'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { backend } from '@/lib/backend';
import { setOrder } from '@/lib/slice';
import { PositionsTable } from './PositionsTable';
import { store, setPositions, setDisplayPrice, addPositions, setPlanDate } from '@/lib/slice';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import triplexCalc from '@askell/shared/calc/triplex';
import packagingCalc from '@askell/shared/calc/packaging';
import { calculateMaterialLayouts, getCuttingAllowance, buildTaskOrderGroups } from '@/app/(app)/cuttingLayouts/cuttingLayouts';
import { CuttingSheetPreview, formatPercent, getWasteBadgeClass } from '@/app/(app)/cuttingLayouts/CuttingSheetPreview';
import { POSITION_CALCULATORS } from './utils/positionCalculators';
import { exportPositionsToExcel, importPositionsFromExcel, downloadWorkbookBuffer } from './utils/excelPositions';
import recalcDeadline from './utils/recalcDeadline.js';
import ExcelJS from 'exceljs';
// Right-side panel (~60%): order/positions management. Currently a structural
// scaffold — search bar, order meta, an action button row, a positions info
// block and the positions table. Handlers are stubs to be wired later.
const priceItems = {
  gostPrice: 'Выше госта',
  retailPrice: 'Розница',
  bulkPrice: 'Опт',
  dealerPrice: 'Дилер',
  vipPrice: 'ВИП'
}
const reversePriceMap = priceItems ? Object.fromEntries(Object.entries(priceItems).map(([key, value]) => [value, key])) : {};

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

// Формат ячеек с денежными суммами в Excel-отчёте (как в backend-отчётах).
const CURRENCY_FORMAT = '#,##0.00 "₽"';

// Добавляет строку в лист Excel с нужным оформлением: жирный шрифт для
// заголовков/итогов, заливка для секций, отступ для вложенных строк и
// формат валюты/процента для указанных колонок (1-based индексы).
function addExcelRow(sheet, values, { bold = false, fill = false, indent = 0, moneyCols = [], percentCols = [], topBorder = false } = {}) {
  const row = sheet.addRow(values);
  if (bold) row.font = { bold: true };
  if (fill) {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    });
  }
  if (indent) row.getCell(2).alignment = { indent };
  moneyCols.forEach((col) => {
    const cell = row.getCell(col);
    if (typeof cell.value === 'number') cell.numFmt = CURRENCY_FORMAT;
  });
  percentCols.forEach((col) => {
    const cell = row.getCell(col);
    if (typeof cell.value === 'number') cell.numFmt = '0.00"%"';
  });
  if (topBorder) {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: { style: 'thin' } };
    });
  }
  return row;
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
  const planDate = useSelector((state) => state.app.planDate);
  const planDateObj = useMemo(() => (planDate ? new Date(planDate) : null), [planDate]);
  const days = useMemo(() => calcDays(planDateObj), [planDateObj]);
  const [disabled, setDisabled] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [materialLayouts, setMaterialLayouts] = useState(null);
  const [lastTrims, setLastTrims] = useState({});
  const [viewMaterial, setViewMaterial] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const positionsInfo = useMemo(() => {
    return positions.reduce(
      (acc, position) => {
        const { prices, quantity = 1, discount = 0 } = position;
        acc.totalQuantity += quantity;

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
        totalQuantity: 0
      }
    );
  }, [positions, displayPrice]);
  const handleSearch = async () => {
    const name = orderNameRef.current;
    if (!name) return;
    setDisabled(true);
    try{
      const { order, positions } = await backend(`/sklad/order?name=${name}`);
      dispatch(setOrder(order));
      dispatch(setPositions([]));
      dispatch(addPositions(positions));
      setMaterialLayouts(null)
      const prices = positions[0]?.prices;
      const price = positions[0].price;
      const match = Object.entries(prices || {}).find(([key, value]) => value === price);
      if(match){
        const [priceType] = match;
        dispatch(setDisplayPrice(priceType))
        toast.success('Установлен тип цен по первой позиции: ' + priceItems[priceType])
      }
      else{
        const match = reversePriceMap[order.agent?.priceType?.name]
        if(match){
          dispatch(setDisplayPrice(match))
          toast.success('Установлен тип цен контрагента: ' + priceItems[match])
        }
        else{
          dispatch(setDisplayPrice('retailPrice'))
          toast.success('Не удалось подобрать тип цен по позициям и контрагенту. Установлен тип цен по умолчанию: Розница')
        }
      }

    } finally {
      toast.success(`Заказ ${name} загружен`);
      setDisabled(false); 
    }
  };
  const handleReset = () => {
    dispatch(setOrder(null));
    dispatch(setPositions([]));
    dispatch(setPlanDate(null));
    setMaterialLayouts(null);
    setLastTrims({});
    setMaterialLayouts(null);
  };
  const handleSave = async () => {
    const positions = store.getState().app.positions;
    const order = store.getState().app.currentOrder;
    if (!order) return;
    try{
      setDisabled(true)
      handleRecalculateTrim(true)
      handleRecalcDeadline()
      const date = formatDate(new Date(store.getState().app.planDate))
      const days = calcDays(new Date(store.getState().app.planDate));
      const positions = store.getState().app.positions
      const response = await backend(`/sklad/saveOrder`, {
        method: 'POST',
        body: { positions, order, displayPrice, planDate: { date, workDays: days.workDays } }
      });
      dispatch(setPositions([]));
      const { order: freshOrder, positions: freshPositions } = await backend(`/sklad/order?name=${order.name}`);
      dispatch(setOrder(freshOrder));
      dispatch(addPositions(freshPositions));
    }catch(err){
      console.error(err)
      toast.error(`Ошибка: ${err.message || String(err)}`);
    }finally{
      setDisabled(false)
    }
  }
  const handleDeleteSelected = () => {
    const unselectedPositions = positions.filter((p) => !p.selected);
    dispatch(setPositions(unselectedPositions));
  }
  const handlePackage = () => {
    const selfcost = store.getState().app.selfcost;
    const positions = store.getState().app.positions;
    if(positions.length === 0){
      toast.error('Нет позиций для упаковки');
      return;
    }
    if(!selfcost?.packaging){
      toast.error('Себестоимость упаковки не загружена');
      return;
    }
    const pos = packagingCalc(positions, selfcost);
    dispatch(addPositions(pos));
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
        const usedTriplex = position?.result?.other?.usedTriplex || [];
        getPositionMaterials(position.initialData).forEach((material) => {
          if (!material) return;
          // У стеклопакета одно из "стёкол" может быть триплексом — в этом
          // случае раскладку на листе нужно строить не по названию триплекса
          // (это не сырьевой материал), а по реальным стёклам, из которых он
          // собран (initialData триплекса берётся из result.other.usedTriplex).
          if (material.toLowerCase().includes('триплекс')) {
            const triplexData = usedTriplex.find((t) => t?.name === material);
            if (!triplexData) {
              toast.error(`Не найдены данные триплекса "${material}" для позиции ${position.name || position.key || index}`);
              return;
            }
            const triplexInitialData = triplexData.initialData || {};
            const triplexWidth = triplexInitialData.width || width;
            const triplexHeight = triplexInitialData.height || height;
            getPositionMaterials(triplexInitialData).forEach((triplexMaterial) => {
              if (!triplexMaterial) return;
              if (!piecesByMaterial[triplexMaterial]) piecesByMaterial[triplexMaterial] = [];
              const triplexAllowance = getCuttingAllowance(triplexMaterial);
              piecesByMaterial[triplexMaterial].push({
                id: `${position.key || index}-${material}-${triplexMaterial}`,
                width: Number(triplexWidth) + triplexAllowance,
                height: Number(triplexHeight) + triplexAllowance,
                quantity: Number(quantity) || 1,
              });
            });
            return;
          }
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
      const { trims: computedTrims, errors, materialLayouts: computedLayouts } = calculateMaterialLayouts(piecesByMaterial, selfcost.materials);
      trims = computedTrims;
      setMaterialLayouts(computedLayouts);
      Object.keys(errors).forEach((material) => toast.error(`Не удалось рассчитать обрезь для материала: ${material}`));
    } else {
      setMaterialLayouts(null);
    }
    setLastTrims(trims);
    const recalculated = rawPositions.map((position) => recalculatePosition(position, selfcost, trims));
    dispatch(setPositions(recalculated));
    toast.success(withLayout ? 'Обрезь пересчитана с раскладкой' : 'Обрезь пересчитана с базовым %');
  }
  const handleRecalcDeadline = () => {
    try{
      console.time('simulation')
      const settings = store.getState().app.settings;
      const res = recalcDeadline()
      const {calcMoment, lastTier3End, machines, tier3EndTimes, hasPrint, lastEnd} = res
      const date = new Date(lastTier3End?.time || lastEnd || Date.now());
      date.setDate(date.getDate()
        + (settings?.addProdDays?.value || settings?.addProdDays?.default || 0)
        + (hasPrint ? (settings?.addPrintDays?.value || settings?.addPrintDays?.default || 0) : 0)
      );//Прибавляем дни в зависимости от настроек
      const day = date.getDay();//Прибавляем дни, если дата попадает на выходные
      if (day === 6) date.setDate(date.getDate() + 2);
      else if (day === 0) date.setDate(date.getDate() + 1);
      dispatch(setPlanDate(date.toISOString()));
      console.timeEnd('simulation')
      toast.success(`Срок пересчитан: ${date.toISOString().split('T')[0]}`);
    }catch(err){
      console.error(err)
      toast.error(`Ошибка: ${err.message || String(err)}`);
    }
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
  const handleExcelReport = async () => {
    try {
      setDisabled(true);
      if (!positions.length) {
        toast.error('Нет позиций для отчета');
        return;
      }

      const num = (n) => Number(n) || 0;
      const round2 = (n) => Math.round(num(n) * 100) / 100;
      // приоритет значения такой же, как в окне "Детали позиции"
      const pickValue = (item) => num(item?.finalValue ?? item?.calcValue ?? item?.value);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Askell';
      workbook.created = new Date();

      const detailSheet = workbook.addWorksheet('Позиции');
      detailSheet.columns = [
        { width: 24 }, { width: 32 }, { width: 14 }, { width: 16 },
        { width: 12 }, { width: 12 }, { width: 32 }, { width: 45 },
      ];
      addExcelRow(detailSheet, ['Позиция', 'Наименование', 'За 1 шт', 'Итого (×кол-во)', 'ФОТ', 'Налог', 'Формула', 'Пояснение'], { bold: true, fill: true });
      detailSheet.views = [{ state: 'frozen', ySplit: 1 }];

      const materialsAgg = {};
      const worksAgg = {};
      const expensesAgg = { workshop: 0, commercial: 0, household: 0 };

      positions.forEach((position, index) => {
        const { result } = position || {};
        const quantity = num(position.quantity || position.initialData?.quantity) || 1;
        const positionName = position.name || position.position?.assortment?.name || position.key || '';

        addExcelRow(detailSheet, [`Позиция ${index + 1}: ${positionName}`, `Количество: ${quantity}`, '', '', '', '', '', ''], { bold: true, fill: true });

        if (!result) {
          addExcelRow(detailSheet, ['', 'Нет данных расчета', '', '', '', '', '', '']);
          detailSheet.addRow([]);
          return;
        }

        const { materials = [], works = [], finalPrice = [], additions = [] } = result;

        if (materials.length) {
          addExcelRow(detailSheet, ['Материалы', '', '', '', '', '', '', ''], { bold: true });
          let totalMaterialsUnit = 0;
          materials.forEach((item) => {
            const unit = pickValue(item);
            totalMaterialsUnit += unit;
            addExcelRow(detailSheet, ['', item.name || '', round2(unit), round2(unit * quantity), '', '', item.formula || '', item.string || ''], { indent: 1, moneyCols: [3, 4] });

            const key = item.name || 'Без названия';
            if (!materialsAgg[key]) materialsAgg[key] = { totalCost: 0, totalCount: 0, hasCount: false };
            materialsAgg[key].totalCost += unit * quantity;
            // у некоторых материалов (в основном у стекла) нет явного count -
            // в этом случае берем площадь позиции (result.other.S) как количество
            const countValue = item.count ?? result.other?.S;
            if (countValue !== undefined && countValue !== null) {
              materialsAgg[key].totalCount += num(countValue) * quantity * (position?.result?.other?.trims?.[item.name] ?? 1);
              materialsAgg[key].hasCount = true;
            }
          });
          addExcelRow(detailSheet, ['', 'Итого по материалам', round2(totalMaterialsUnit), round2(totalMaterialsUnit * quantity), '', '', '', ''], { bold: true, moneyCols: [3, 4], topBorder: true });
        }

        if (works.length) {
          addExcelRow(detailSheet, ['Работы', '', '', '', '', '', '', ''], { bold: true });
          let totalWorksUnit = 0;
          let totalWorkshop = 0, totalCommercial = 0, totalHousehold = 0;
          works.forEach((item) => {
            const unit = num(item.value) + num(item.tax);
            totalWorksUnit += unit;
            totalWorkshop += num(item.workshopExpenses);
            totalCommercial += num(item.commercialExpenses);
            totalHousehold += num(item.householdExpenses);
            addExcelRow(detailSheet, ['', item.name || '', round2(unit), round2(unit * quantity), round2(item.value), round2(item.tax), item.formula || '', item.string || ''], { indent: 1, moneyCols: [3, 4, 5, 6] });

            const workKey = item.name || 'Без названия';
            if (!worksAgg[workKey]) worksAgg[workKey] = 0;
            worksAgg[workKey] += unit * quantity;
          });
          addExcelRow(detailSheet, ['', 'Итого по работам', round2(totalWorksUnit), round2(totalWorksUnit * quantity), '', '', '', ''], { bold: true, moneyCols: [3, 4], topBorder: true });

          const totalExpenses = totalWorkshop + totalCommercial + totalHousehold;
          addExcelRow(detailSheet, ['Расходы', '', '', '', '', '', '', ''], { bold: true });
          addExcelRow(detailSheet, ['', 'Цеховые', round2(totalWorkshop), round2(totalWorkshop * quantity), '', '', '', ''], { indent: 1, moneyCols: [3, 4] });
          addExcelRow(detailSheet, ['', 'Коммерческие', round2(totalCommercial), round2(totalCommercial * quantity), '', '', '', ''], { indent: 1, moneyCols: [3, 4] });
          addExcelRow(detailSheet, ['', 'Общехозяйственные', round2(totalHousehold), round2(totalHousehold * quantity), '', '', '', ''], { indent: 1, moneyCols: [3, 4] });
          addExcelRow(detailSheet, ['', 'Итого расходов', round2(totalExpenses), round2(totalExpenses * quantity), '', '', '', ''], { bold: true, moneyCols: [3, 4], topBorder: true });

          expensesAgg.workshop += totalWorkshop * quantity;
          expensesAgg.commercial += totalCommercial * quantity;
          expensesAgg.household += totalHousehold * quantity;
        }

        if (additions.length) {
          addExcelRow(detailSheet, ['Комплектующие', '', '', '', '', '', '', ''], { bold: true });
          let totalAdditionsUnit = 0;
          additions.forEach((item) => {
            const unit = pickValue(item);
            totalAdditionsUnit += unit;
            addExcelRow(detailSheet, ['', item.name || '', round2(unit), round2(unit * quantity), '', '', item.formula || '', item.string || ''], { indent: 1, moneyCols: [3, 4] });
          });
          addExcelRow(detailSheet, ['', 'Итого по комплектующим', round2(totalAdditionsUnit), round2(totalAdditionsUnit * quantity), '', '', '', ''], { bold: true, moneyCols: [3, 4], topBorder: true });
        }

        if (finalPrice.length) {
          addExcelRow(detailSheet, ['Цена', '', '', '', '', '', '', ''], { bold: true });
          finalPrice.forEach((item) => {
            const unit = pickValue(item);
            addExcelRow(detailSheet, ['', item.name || '', round2(unit), round2(unit * quantity), '', '', item.formula || '', item.string || ''], { indent: 1, moneyCols: [3, 4] });
          });
        }

        detailSheet.addRow([]);
      });

      const summarySheet = workbook.addWorksheet('Сводка');
      summarySheet.columns = [{ width: 32 }, { width: 18 }, { width: 18 }];

      addExcelRow(summarySheet, ['Материалы', '', ''], { bold: true, fill: true });
      addExcelRow(summarySheet, ['Материал', 'Количество', 'Общая стоимость'], { bold: true });
      let materialsGrandTotal = 0;
      Object.entries(materialsAgg)
        .sort((a, b) => b[1].totalCost - a[1].totalCost)
        .forEach(([name, agg]) => {
          addExcelRow(summarySheet, [name, agg.hasCount ? round2(agg.totalCount) : '—', round2(agg.totalCost)], { moneyCols: [3] });
          materialsGrandTotal += agg.totalCost;
        });
      addExcelRow(summarySheet, ['Материалы всего', '', round2(materialsGrandTotal)], { bold: true, moneyCols: [3], topBorder: true });
      summarySheet.addRow([]);

      addExcelRow(summarySheet, ['Работы', ''], { bold: true, fill: true });
      addExcelRow(summarySheet, ['Работа', 'Общая стоимость'], { bold: true });
      let worksGrandTotal = 0;
      Object.entries(worksAgg)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, cost]) => {
          addExcelRow(summarySheet, [name, round2(cost)], { moneyCols: [2] });
          worksGrandTotal += cost;
        });
      addExcelRow(summarySheet, ['Работы всего', round2(worksGrandTotal)], { bold: true, moneyCols: [2], topBorder: true });
      summarySheet.addRow([]);

      addExcelRow(summarySheet, ['Расходы', ''], { bold: true, fill: true });
      addExcelRow(summarySheet, ['Расход', 'Общая стоимость'], { bold: true });
      addExcelRow(summarySheet, ['Цеховые', round2(expensesAgg.workshop)], { moneyCols: [2] });
      addExcelRow(summarySheet, ['Коммерческие', round2(expensesAgg.commercial)], { moneyCols: [2] });
      addExcelRow(summarySheet, ['Общехозяйственные', round2(expensesAgg.household)], { moneyCols: [2] });
      const expensesGrandTotal = expensesAgg.workshop + expensesAgg.commercial + expensesAgg.household;
      addExcelRow(summarySheet, ['Расходы всего', round2(expensesGrandTotal)], { bold: true, moneyCols: [2], topBorder: true });
      summarySheet.addRow([]);

      const totalCosts = materialsGrandTotal + worksGrandTotal + expensesGrandTotal;

      const orderTotal = positions.reduce((sum, position) => {
        const quantity = num(position.quantity || position.initialData?.quantity) || 1;
        const unitPrice = num(position.prices?.[displayPrice]);
        return sum + unitPrice * quantity;
      }, 0);
      const VAT_RATE = 0.22;
      const vatAmount = (orderTotal * VAT_RATE) / (1 + VAT_RATE);
      const totalWithoutVat = orderTotal - vatAmount;
      const margin = totalWithoutVat - totalCosts;
      const marginPercent = totalWithoutVat ? (margin / totalWithoutVat) * 100 : 0;

      addExcelRow(summarySheet, ['Итоги', ''], { bold: true, fill: true });
      addExcelRow(summarySheet, ['Итого затрат', round2(totalCosts)], { moneyCols: [2] });
      addExcelRow(summarySheet, [`Общая сумма заказа (${priceItems[displayPrice] || displayPrice})`, round2(orderTotal)], { moneyCols: [2] });
      addExcelRow(summarySheet, [`Сумма НДС (${round2(VAT_RATE * 100)}%)`, round2(vatAmount)], { moneyCols: [2] });
      addExcelRow(summarySheet, ['Сумма без НДС', round2(totalWithoutVat)], { moneyCols: [2] });
      addExcelRow(summarySheet, ['Маржа по проекту', round2(margin)], { bold: true, moneyCols: [2], topBorder: true });
      addExcelRow(summarySheet, ['Маржа в %', round2(marginPercent)], { percentCols: [2] });

      const buffer = await workbook.xlsx.writeBuffer();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      downloadWorkbookBuffer(buffer, `positions_report_${stamp}.xlsx`);
      toast.success('Отчет создан');
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при создании отчета');
    } finally {
      setDisabled(false);
    }
  }
  const ACTION_BUTTONS = [
    { id: 'save', label: 'Сохранить', action: handleSave },
    { id: 'deleteSelected', label: 'Удалить выделенное', action: handleDeleteSelected },
    { id: 'package', label: 'Упаковка', action: handlePackage },
    { id: 'recalcDeadline', label: 'Пересчитать срок', action: handleRecalcDeadline },
  ];
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
          Контрагент: <span className="text-zinc-900 dark:text-zinc-100">{order?.agent?.name ?? '—'}</span>
        </span>
        <span>
          Тип цен контрагента: <span className="text-zinc-900 dark:text-zinc-100">{order?.agent?.priceType ?? '—'}</span>
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
            <Button size="sm" variant="ghost" onClick={handleExcelImport}>Загрузить</Button>
            <Button size="sm" variant="ghost" onClick={handleExcelExport}>Выгрузить</Button>
            <Button size="sm" variant="ghost" onClick={handleExcelReport}>Отчет по позициям</Button>
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
            <span>Общая себестоимость: {formatPrice(positionsInfo.cost)}</span>
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
            <span>Календарные дни: {days.calendarDays}</span>
            <span>Рабочик дни: {days.workDays}</span>
            <span>~Дата готовности: {planDateObj ? planDateObj.toISOString().split('T')[0] : '—'}</span>
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
            <span>Количество: {positionsInfo.totalQuantity}</span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="outline">
              Обрезь 
              <ChevronDown />
            </Button>
          }>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-start gap-1 text-[14px] w-64">
            {materialLayouts && Object.keys(materialLayouts).length > 0 ? (
              Object.entries(materialLayouts).map(([material, data]) => (
                <Button
                  key={material}
                  size="sm"
                  variant="ghost"
                  className="flex w-full items-center justify-between gap-2"
                  onClick={() => setViewMaterial(material)}
                >
                  <span className="truncate">{material}</span>
                  <Badge className={getWasteBadgeClass(data.summary.averageWaste)}>
                    {formatPercent(data.summary.averageWaste)}
                  </Badge>
                </Button>
              ))
            ) : Object.keys(lastTrims).length > 0 ? (
              Object.entries(lastTrims).map(([material, trim]) => (
                <div key={material} className="flex w-full items-center justify-between gap-2 px-2 py-1">
                  <span className="truncate">{material}</span>
                  <span>{(((trim || 1) - 1) * 100).toFixed(2)}%</span>
                </div>
              ))
            ) : (
              <span className="px-2 py-1 text-muted-foreground">
                Нет данных. Нажмите «Пересчитать обрезь»
              </span>
            )}
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

      <Dialog open={!!viewMaterial} onOpenChange={(open) => !open && setViewMaterial(null)}>
        <DialogContent className="max-h-[85vh] w-[min(900px,95vw)] max-w-[95vw] flex-col gap-4 overflow-y-auto">
          {viewMaterial && materialLayouts?.[viewMaterial] ? (
            <div className="overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{viewMaterial}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  Лист: {materialLayouts[viewMaterial].sheet.width} x {materialLayouts[viewMaterial].sheet.height} мм
                </Badge>
                <Badge variant="outline">Деталей: {materialLayouts[viewMaterial].summary.totalPieces}</Badge>
                <Badge variant="outline">Листов: {materialLayouts[viewMaterial].summary.totalPanelsUsed}</Badge>
                <Badge className={getWasteBadgeClass(materialLayouts[viewMaterial].summary.averageWaste)}>
                  Обрезь: {formatPercent(materialLayouts[viewMaterial].summary.averageWaste)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {materialLayouts[viewMaterial].layouts.map((layout, index) => (
                  <div key={layout.id}>
                    <CuttingSheetPreview
                      layout={layout}
                      label={`Лист ${index + 1}`}
                      maxWidth={220}
                      maxHeight={150}
                      interactive
                      onClick={() => setSelectedLayout({ material: viewMaterial, layout, layoutIndex: index })}
                    />
                    <div className="text-xs text-muted-foreground">{layout.pieces.length} деталей на листе</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLayout} onOpenChange={(open) => !open && setSelectedLayout(null)}>
        <DialogContent className="w-fit max-w-[95vw] flex-col gap-4">
          {selectedLayout ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLayout.material} · лист {selectedLayout.layoutIndex + 1}</DialogTitle>
              </DialogHeader>
              <div className="flex h-[min(640px,65vh)] min-h-0 gap-4">
                <div className="flex-1 min-w-0 flex">
                  <CuttingSheetPreview
                    layout={selectedLayout.layout}
                    fill
                    maxWidth={760}
                    showPieceLabels
                    className="w-full ring-1 ring-primary/30"
                  />
                </div>

                <div className="flex h-full w-[300px] shrink-0 flex-col gap-4 overflow-y-auto pr-1">
                  <div>
                    <div className="mb-1.5 text-sm font-medium">Заказы на этом листе</div>
                    <div className="space-y-1.5">
                      {buildTaskOrderGroups([selectedLayout.layout]).map((order) => (
                        <div key={order.key} className="rounded-md border px-2.5 py-1.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{order.orderNumber}</span>
                            <Badge variant="outline">{order.pieces.length} шт.</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">ПЗ: {order.docName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
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
function formatDate(date) {
    const pad = n => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function calcDays(targetDate){
  if(!targetDate) return {calendarDays: 0, workDays: 0};
  const now = new Date();

  const diff = targetDate.getTime() - now.getTime();
  const calendarDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

  let workDays = 0;
  const current = new Date(now);

  while (current <= targetDate) {
    const day = current.getDay(); // 0 - Вс, 6 - Сб

    if (day !== 0 && day !== 6) {
      workDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return { calendarDays, workDays };
}