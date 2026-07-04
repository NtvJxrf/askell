import ExcelJS from 'exceljs';
import { POSITION_CALCULATORS } from './positionCalculators';

// Объектные/массивные значения (например `trims`) кладём в ячейку как JSON,
// иначе ExcelJS запишет "[object Object]".
function serializeValue(value) {
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value;
}

function deserializeValue(value) {
  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function downloadWorkbookBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Экспортирует все позиции с известным calcType (result.other.type) в Excel:
// первая строка — названия полей initialData + calcType, остальные строки —
// сами позиции. Позиции без calcType пропускаются.
export async function exportPositionsToExcel(positions, filename) {
  const rows = (positions || [])
    .filter((position) => position?.result?.other?.type)
    .map((position) => ({
      calcType: position.result.other.type,
      ...(position.initialData || {}),
      quantity: position.quantity ?? position.initialData?.quantity ?? 1,
    }));

  const skipped = (positions?.length || 0) - rows.length;
  if (rows.length === 0) return { count: 0, skipped };

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set(['calcType']))
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Позиции');
  sheet.columns = headers.map((header) => ({ header, key: header }));
  rows.forEach((row) => {
    const serialized = {};
    headers.forEach((header) => {
      serialized[header] = serializeValue(row[header]);
    });
    sheet.addRow(serialized);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbookBuffer(buffer, filename || `positions_${Date.now()}.xlsx`);

  return { count: rows.length, skipped };
}

// Читает Excel-файл (первая строка — заголовки: calcType + поля initialData),
// для каждой строки вызывает соответствующий калькулятор из POSITION_CALCULATORS.
// Возвращает посчитанные позиции и сводку: total/added/skipped/errors.
export async function importPositionsFromExcel(file, selfcost, triplexArray = []) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { positions: [], total: 0, added: 0, skipped: 0, errors: [] };
  }

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      data[header] = deserializeValue(cell.value);
    });
    if (Object.keys(data).length > 0) rows.push({ rowNumber, data });
  });

  const positions = [];
  const errors = [];
  let skipped = 0;

  rows.forEach(({ rowNumber, data }) => {
    const { calcType, ...initialData } = data;
    const calc = POSITION_CALCULATORS[calcType];
    if (!calc) {
      skipped += 1;
      return;
    }
    try {
      const result = calcType === 'Стеклопакет'
        ? calc(initialData, selfcost, triplexArray)
        : calc(initialData, selfcost);
      positions.push(result);
    } catch (error) {
      errors.push({ row: rowNumber, calcType, message: error?.message || String(error) });
    }
  });

  return {
    positions,
    total: rows.length,
    added: positions.length,
    skipped,
    errors,
  };
}
