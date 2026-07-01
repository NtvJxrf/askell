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

export const buildCuttingPiecesByMaterial = (cuttingHeap = []) => {
  const grouped = {};
  const skipped = [];

  cuttingHeap.forEach((item, index) => {
    const attributes = item?.attributes || {};
    const material = attributes['Материал 1'];
    const sourceWidth = toNumber(attributes['Ширина в мм']);
    const sourceHeight = toNumber(attributes['Длина в мм']);
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
        material,
        sourceWidth,
        sourceHeight,
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