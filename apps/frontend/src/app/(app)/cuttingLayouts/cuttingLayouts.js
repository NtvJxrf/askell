import trimCalc from '@askell/shared/calc/trimCalc';

const DEFAULT_SHEET = { width: 3210, height: 2250 };

const toNumber = (value) => Number(value || 0);

export const getMaterialThickness = (material) => {
  const match = String(material ?? '').match(/(\d+(?:[.,]\d+)?)\s*мм/i);
  return match ? Number(match[1].replace(',', '.')) : 0;
};

export const getCuttingAllowance = (material) => {
  const thickness = getMaterialThickness(material);
  return (thickness >= 8 ? 8 : 4) * 2;
};

export const getSheetCandidates = (material, materialsCatalog = {}) => {
  const materialData = materialsCatalog?.[material] || {};
  const sizeCandidates = Array.isArray(materialData.sizes) ? materialData.sizes : [];
  const rawCandidates = sizeCandidates.length
    ? sizeCandidates
    : [{ width: materialData.w || DEFAULT_SHEET.width, height: materialData.l || DEFAULT_SHEET.height }];

  return rawCandidates
    .map((size) => ({
      width: toNumber(size?.width || size?.w) - 40,
      height: toNumber(size?.height || size?.l) - 40,
    }))
    .filter((size) => size.width > 0 && size.height > 0);
};

export const getWasteScore = (sheet, pieces, result) => {
  const totalSheetArea = toNumber(result?.summary?.totalPanelsUsed) * sheet.width * sheet.height;
  const totalPieceArea = pieces.reduce(
    (sum, piece) => sum + (toNumber(piece.width) * toNumber(piece.height) * (toNumber(piece.quantity) || 1)),
    0
  );

  if (!totalSheetArea) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(totalSheetArea - totalPieceArea, 0);
};

export const calculateMaterialLayouts = (piecesByMaterial = {}, materialsCatalog = {}) => {
  const trims = {};
  const materialLayouts = {};
  const errors = {};

  Object.entries(piecesByMaterial).forEach(([material, pieces]) => {
    if (!Array.isArray(pieces) || pieces.length === 0) {
      return;
    }

    const sheetCandidates = getSheetCandidates(material, materialsCatalog);
    const candidateErrors = [];
    let bestCandidate = null;

    sheetCandidates.forEach((sheet) => {
      try {
        const result = trimCalc(sheet, pieces, {}, material);
        const avgWaste = Number(result?.summary?.averageWaste || 0);
        const wasteScore = getWasteScore(sheet, pieces, result);

        if (!bestCandidate || wasteScore < bestCandidate.wasteScore || (wasteScore === bestCandidate.wasteScore && avgWaste < bestCandidate.avgWaste)) {
          bestCandidate = {
            sheet,
            result,
            avgWaste,
            wasteScore,
          };
        }
      } catch (error) {
        candidateErrors.push(error);
      }
    });

    if (!bestCandidate) {
      errors[material] = candidateErrors.length
        ? candidateErrors.map((error) => error.message)
        : ['Не удалось подобрать лист для материала'];
      return;
    }

    trims[material] = 1 + bestCandidate.avgWaste / 100;
    materialLayouts[material] = {
      sheet: bestCandidate.sheet,
      pieces,
      layouts: bestCandidate.result.layouts,
      offcuts: bestCandidate.result.offcuts,
      summary: bestCandidate.result.summary,
    };
  });

  return { trims, materialLayouts, errors };
};

export const DAILY_TASK_STRATEGIES = {
  DATE: "date",
  OPTIMIZATION: "optimization",
};

const getLayoutEarliestTime = (layout) =>
  layout.pieces.reduce((earliest, piece) => {
    const moment = piece.source?.deliveryPlannedMoment;
    const time = moment ? new Date(moment).getTime() : Infinity;

    return time < earliest ? time : earliest;
  }, Infinity);

export const buildDailyCuttingTask = (materialsEntries = [], { maxArea = 150, strategy = DAILY_TASK_STRATEGIES.DATE } = {}) => {
  const tomorrowEnd = new Date();
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const urgentBeforeTime = tomorrowEnd.getTime();

  const layoutInfos = [];

  materialsEntries.forEach(([material, data]) => {
    const sheetAreaM2 = (data.sheet.width * data.sheet.height) / 1_000_000;

    data.layouts.forEach((layout) => {
      const layoutKey = `${material}::${layout.id}`;
      const earliestTime = getLayoutEarliestTime(layout);

      layoutInfos.push({
        material,
        layout,
        layoutKey,
        sheetAreaM2,
        earliestTime,
        isUrgent: earliestTime < urgentBeforeTime,
        waste: Number(layout.waste || 0),
      });
    });
  });

  const urgentLayouts = layoutInfos
    .filter((entry) => entry.isUrgent)
    .sort((a, b) => a.earliestTime - b.earliestTime);

  const restLayouts = layoutInfos.filter((entry) => !entry.isUrgent);

  if (strategy === DAILY_TASK_STRATEGIES.OPTIMIZATION) {
    restLayouts.sort((a, b) => a.waste - b.waste || a.earliestTime - b.earliestTime);
  } else {
    restLayouts.sort((a, b) => a.earliestTime - b.earliestTime);
  }

  const taskLayouts = [];
  let totalArea = 0;

  urgentLayouts.forEach((entry) => {
    totalArea += entry.sheetAreaM2;
    taskLayouts.push({
      material: entry.material,
      layout: entry.layout,
      sheetAreaM2: entry.sheetAreaM2,
    });
  });

  for (const entry of restLayouts) {
    if (totalArea >= maxArea) break;

    totalArea += entry.sheetAreaM2;
    taskLayouts.push({
      material: entry.material,
      layout: entry.layout,
      sheetAreaM2: entry.sheetAreaM2,
    });
  }

  return { maxArea, totalArea, layouts: taskLayouts, moment: Date.now() };
};

export const groupDailyTaskByMaterial = (task) => {
  const grouped = {};

  task.layouts.forEach(({ material, layout }) => {
    if (!grouped[material]) {
      grouped[material] = { layouts: [] };
    }

    grouped[material].layouts.push(
      typeof structuredClone === 'function' ? structuredClone(layout) : JSON.parse(JSON.stringify(layout))
    );
  });

  const materials = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0], 'ru'));

  return { maxArea: task.maxArea, moment: task.moment, materials };
};

export const buildTaskOrderGroups = (layouts = []) => {
  const grouped = new Map();

  layouts.forEach((layout) => {
    layout.pieces.forEach((piece) => {
      const orderNumber = piece.source?.orderNumber || 'Без заказа';
      const docName = piece.source?.docName || 'Без ПЗ';
      const key = `${orderNumber}::${docName}`;
      const pieceWithLayout = { ...piece, layoutId: layout.id };
      const existing = grouped.get(key);

      if (existing) {
        existing.pieces.push(pieceWithLayout);
        return;
      }

      grouped.set(key, { key, orderNumber, docName, pieces: [pieceWithLayout] });
    });
  });

  return Array.from(grouped.values()).sort(
    (a, b) => b.pieces.length - a.pieces.length || a.orderNumber.localeCompare(b.orderNumber, 'ru')
  );
};

export const buildSourceGroups = (layouts = []) => {
  const grouped = new Map();

  layouts.forEach((layout) => {
    layout.pieces.forEach((piece) => {
      const key = piece.sourceId || piece.source?.id || piece.pieceId;
      const pieceWithLayout = { ...piece, layoutId: layout.id };
      const existing = grouped.get(key);

      if (existing) {
        existing.count += 1;
        existing.pieces.push(pieceWithLayout);
        return;
      }

      grouped.set(key, {
        sourceId: key,
        source: piece.source,
        sourceWidth: piece.sourceWidth,
        sourceHeight: piece.sourceHeight,
        count: 1,
        pieces: [pieceWithLayout],
      });
    });
  });

  return Array.from(grouped.values()).sort(
    (a, b) => b.count - a.count || (a.source?.orderNumber || '').localeCompare(b.source?.orderNumber || '', 'ru')
  );
};

export const buildCuttingPiecesByMaterial = (cuttingHeap = []) => {
  const grouped = {};
  const skipped = [];

  cuttingHeap.forEach((item, index) => {
    const attributes = item?.attributes || {};
    const material = attributes['Материал 1'];
    const sourceWidth = toNumber(attributes['Ширина в мм']);
    const sourceHeight = toNumber(attributes['Длина в мм']);
    const mark = attributes['Маркировка'] || '';
    const belongsToPosition = attributes['Принадлежит позиции'] || '';
    const sourceId = item?.productionRowId || item?.productionTaskId || `${String(material)}-${index}`;

    if (!material || !sourceWidth || !sourceHeight) {
      skipped.push({
        index,
        id: `${sourceId}-${index}`,
        name: item?.name || 'Без названия',
        material,
        width: sourceWidth,
        height: sourceHeight,
      });
      return;
    }

    if (!grouped[material]) {
      grouped[material] = [];
    }

    const allowance = getCuttingAllowance(material);
    const width = sourceWidth + allowance;
    const height = sourceHeight + allowance;

    grouped[material].push({
      id: `${sourceId}-${index}`,
      width,
      height,
      quantity: 1,
      sourceWidth,
      sourceHeight,
      source: {
        id: sourceId,
        name: item?.name || 'Без названия',
        docName: item?.taskName || '',
        orderNumber: item?.taskAttrs?.['№ заказа покупателя'] || attributes['№ заказа покупателя'] || '',
        mark,
        taskAttrs: item.taskAttrs || {},
        totalQuantity: item?.totalQuantity || 1,
        material,
        sourceWidth,
        sourceHeight,
        belongsToPosition,
        assortmentId: item.assortmentId,
        productionRowId: item?.productionRowId || '',
        productionTaskId: item?.productionTaskId || '',
        deliveryPlannedMoment: item?.deliveryPlannedMoment || '',
        productionStageId: item?.productionStageId || '',
      },
    });
  });

  return {
    piecesByMaterial: Object.fromEntries(
      Object.entries(grouped).map(([material, pieces]) => [material, pieces])
    ),
    skipped,
  };
};