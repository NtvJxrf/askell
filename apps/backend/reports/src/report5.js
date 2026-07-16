import ExcelJS from 'exceljs'
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FOLDER_FILTER = 'Стекло/Материал от поставщиков';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year, month /* 1-12 */) {
  return new Date(year, month, 0).getDate();
}

function fmtDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

// Разбивает диапазон [startDate, endDate] на периоды по месяцам.
// Для первого месяца началом периода является startDate (а не 1 число),
// для последнего месяца концом периода является endDate (а не последний день месяца).
function getMonthPeriods(startDate, endDate) {
  const [startY, startM, startD] = startDate.split('-').map(Number);
  const [endY, endM, endD] = endDate.split('-').map(Number);

  const periods = [];
  let y = startY;
  let m = startM;

  while (y < endY || (y === endY && m <= endM)) {
    const isFirst = y === startY && m === startM;
    const isLast = y === endY && m === endM;

    const fromDay = isFirst ? startD : 1;
    const toDay = isLast ? endD : daysInMonth(y, m);

    periods.push({
      label: `${MONTH_NAMES[m - 1]} ${y}`,
      momentFrom: `${fmtDate(y, m, fromDay)} 00:00:00`,
      momentTo: `${fmtDate(y, m, toDay)} 23:59:59`,
    });

    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return periods;
}

function setColumnWidths(worksheet, widths) {
  widths.forEach((w, i) => {
    worksheet.getColumn(i + 1).width = w;
  });
}

function addJsonSheet(workbook, sheetName, data, widths) {
  const worksheet = workbook.addWorksheet(sheetName);

  const columns = [];
  const seen = new Set();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  worksheet.columns = columns.map(key => ({ header: key, key }));
  worksheet.addRows(data);

  if (widths) setColumnWidths(worksheet, widths);

  return worksheet;
}

export default async function createReport({ filters, ctx }) {
  const { startDate, endDate } = filters;
  const periods = getMonthPeriods(startDate, endDate);

  const periodRows = await Promise.all(
    periods.map(period =>
      ctx.call('proxy.fetchAllRows', {
        url: `https://api.moysklad.ru/api/remap/1.2/report/turnover/all?momentFrom=${encodeURIComponent(period.momentFrom)}&momentTo=${encodeURIComponent(period.momentTo)}`
      })
    )
  );

  // Наименование товара -> { [месяц]: расход }
  const productMap = new Map();

  periods.forEach((period, i) => {
    const rows = periodRows[i] || [];

    for (const row of rows) {
      if (!row.assortment?.productFolder?.name?.includes(FOLDER_FILTER)) continue;

      const name = row.assortment?.name;
      if (!name) continue;

      if (!productMap.has(name)) productMap.set(name, {});
      const entry = productMap.get(name);
      entry[period.label] = (entry[period.label] || 0) + (row.outcome?.quantity || 0);
    }
  });

  const sortedNames = Array.from(productMap.keys()).sort((a, b) => a.localeCompare(b));

  const sheetData = sortedNames.map(name => {
    const entry = productMap.get(name);
    const row = { 'Наименование': name };
    let total = 0;

    for (const period of periods) {
      const qty = Number((entry[period.label] || 0));
      row[period.label] = qty;
      total += qty;
    }

    row['Итого'] = Number(total);
    return row;
  });

  const totalsRow = { 'Наименование': 'ИТОГО' };
  let grandTotal = 0;
  for (const period of periods) {
    const sum = sheetData.reduce((acc, r) => acc + (r[period.label] || 0), 0);
    totalsRow[period.label] = Number(sum);
    grandTotal += sum;
  }
  totalsRow['Итого'] = Number(grandTotal);
  sheetData.push(totalsRow);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Askell';
  workbook.created = new Date();

  const widths = [40, ...periods.map(() => 12), 12];
  const worksheet = addJsonSheet(workbook, 'Расход стекла', sheetData, widths);
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(worksheet.rowCount).font = { bold: true };

  const uuid = crypto.randomUUID();
  const filePath = path.join(__dirname, "../temporal", `${uuid}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    uuid,
    createdAt: Date.now(),
  };
}
