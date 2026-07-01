import ExcelJS from 'exceljs';
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAttr(assortment, attrName) {
  if(attrName == 'Серия') return assortment?.attributes?.find(a => a.name === attrName)?.value?.name;
  return assortment?.attributes?.find(a => a.name === attrName)?.value;
}

const EXCLUDED_TYPES = new Set([
  'СМД',
  'Стекло',
  'Триплекс',
  'Керагласс',
  'Закалка стекла',
]);


function calcPositionSum(position) {
  const price = position.price / 100; // из копеек
  const discount = position.discount || 0;
  const qty = position.quantity;

  const finalPrice = price * (1 - discount / 100);
  return finalPrice * qty;
}

function setColumnWidths(worksheet, widths) {
  widths.forEach((w, i) => {
    worksheet.getColumn(i + 1).width = w;
  });
}

function addJsonSheet(workbook, sheetName, data, widths) {
  const worksheet = workbook.addWorksheet(sheetName);

  // Колонки формируются как объединение всех ключей, в порядке появления (аналог XLSX.utils.json_to_sheet)
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

function worksheetToJson(worksheet) {
  const headers = {};
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  const data = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber === 1) return; // пропускаем заголовок

    const obj = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) obj[header] = cell.value;
    });
    data.push(obj);
  });

  return data;
}

function setMoneyFormatByColumn(worksheet, columnName, currencySymbol = '₽') {
  // Находим все индексы колонок, где заголовок содержит columnName
  const matchingCols = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (cell.value && String(cell.value).includes(columnName)) {
      matchingCols.push(colNumber);
    }
  });

  if (matchingCols.length === 0) return; // нет колонок с таким названием

  // Применяем денежный формат ко всем найденным колонкам, кроме заголовка
  for (const colIndex of matchingCols) {
    worksheet.getColumn(colIndex).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      if (typeof cell.value === 'number') {
        cell.numFmt = `#,##0.00 "${currencySymbol}"`;
      }
    });
  }
}

function calcM2(position) {
  const assortment = position.assortment;

  const lengthMm = getAttr(assortment, 'Длина в мм');
  const widthMm = getAttr(assortment, 'Ширина в мм');

  if (!lengthMm || !widthMm) return 0;

  const m2PerItem = (lengthMm / 1000) * (widthMm / 1000);
  return m2PerItem * position.quantity;
}

function getTriplexMaterials(assortment) {
  const materials = [];

  for (let i = 1; i <= 4; i++) {
    const value = getAttr(assortment, `Материал ${i}`);
    if (value) materials.push(value);
  }

  return materials;
}

function extractThicknessMm(name) {
  const match = name.match(/(\d+)\s*мм/i);
  return match ? match[1] : null;
}

function formatTriplexName(materials) {
  return materials.join(' + ');
}

function buildSmdSheet(rows) {
  const seriesMap = new Map();

  for (const invoice of rows) {
    for (const position of invoice.positions?.rows || []) {
      const assortment = position.assortment;
      if (!assortment) continue;

      const type = getAttr(assortment, 'Тип изделия');
      if (type !== 'СМД') continue;

      const name = assortment.name;
      const series = getAttr(assortment, 'Серия') || 'Без серии';

      if (!seriesMap.has(series)) {
        seriesMap.set(series, new Map());
      }

      const nameMap = seriesMap.get(series);
      if (!nameMap.has(name)) {
        nameMap.set(name, { name, qty: 0, sum: 0, m2: 0 });
      }

      const acc = nameMap.get(name);
      acc.qty += position.quantity;
      acc.sum += calcPositionSum(position);
      acc.m2 += calcM2(position);
    }
  }

  const sheetData = [];

  // серии по алфавиту
  const sortedSeries = Array.from(seriesMap.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  for (const series of sortedSeries) {
    sheetData.push({ 'Наименование': `Серия: ${series}` });

    const nameMap = seriesMap.get(series);
    const sortedNames = Array.from(nameMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    sheetData.push(
      ...sortedNames.map(row => ({
        'Наименование': row.name,
        'Кол-во, шт': row.qty,
        'Объём, м²': Number(row.m2.toFixed(3)),
        'Сумма': Number(row.sum.toFixed(2)),
      }))
    );

    sheetData.push({});
  }

  return sheetData;
}

function buildGlassSheet(rows, { isM1 }) {
  const map = new Map();

  for (const invoice of rows) {
    for (const position of invoice.positions?.rows || []) {
      const assortment = position.assortment;
      if (!assortment) continue;

      const type = getAttr(assortment, 'Тип изделия');
      if (type !== 'Стекло') continue;

      const material1 = getAttr(assortment, 'Материал 1');
      if (!material1) continue;

      const hasM1 = material1.includes('М1');
      if (isM1 !== hasM1) continue;

      // Вытаскиваем толщину
      const thickness = extractThicknessMm(material1) || '';

      // Чистим название: убираем толщину и лишние запятые
      let cleanName = material1.replace(/(\d+\s*мм)/i, '').trim();
      cleanName = cleanName.replace(/,+$/, '').trim(); // убираем запятые в конце
      if (!cleanName) cleanName = 'Стекло';

      // Ключ теперь уникальный по материалу + толщине, чтобы разные толщины были в разных строках
      const key = `${cleanName} | ${thickness}`;

      if (!map.has(key)) {
        map.set(key, {
          name: cleanName,
          thickness,
          qty: 0,
          sum: 0,
          m2: 0,
        });
      }

      const acc = map.get(key);
      acc.qty += position.quantity;
      acc.sum += calcPositionSum(position);
      acc.m2 += calcM2(position);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name) || a.thickness.localeCompare(b.thickness))
    .map(row => ({
      'Наименование': row.name,
      'Толщина, мм': row.thickness,
      'Кол-во, шт': row.qty,
      'Объём, м²': Number(row.m2.toFixed(3)),
      'Сумма': Number(row.sum.toFixed(2)),
    }));
}

function buildTriplexSheet(rows) {
  const map = new Map();

  for (const invoice of rows) {
    for (const position of invoice.positions?.rows || []) {
      const assortment = position.assortment;
      if (!assortment) continue;

      const type = getAttr(assortment, 'Тип изделия');
      if (type !== 'Триплекс') continue;

      const materials = getTriplexMaterials(assortment);
      if (!materials.length) continue;

      // Вытаскиваем толщины каждого слоя
      const thicknesses = materials.map(m => extractThicknessMm(m) || '').filter(Boolean);
      const thickness = thicknesses.join(' + ');

      // Чистим материалы: убираем толщину и лишние запятые
      const cleanMaterials = materials.map(m => m.replace(/(\d+\s*мм)/i, '').trim())
                                       .map(m => m.replace(/,+$/, '').trim());
      const key = `${cleanMaterials.join(' | ')} | ${thickness}`;

      if (!map.has(key)) {
        map.set(key, {
          name: formatTriplexName(cleanMaterials),
          thickness,
          qty: 0,
          sum: 0,
          m2: 0,
        });
      }

      const acc = map.get(key);
      acc.qty += position.quantity;
      acc.sum += calcPositionSum(position);
      acc.m2 += calcM2(position);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name) || a.thickness.localeCompare(b.thickness))
    .map(row => ({
      'Наименование': row.name,
      'Толщина, мм': row.thickness,
      'Кол-во, шт': row.qty,
      'Объём, м²': Number(row.m2.toFixed(3)),
      'Сумма': Number(row.sum.toFixed(2)),
    }));
}

function buildKeraglassSheet(rows) {
  const map = new Map();

  for (const invoice of rows) {
    for (const position of invoice.positions?.rows || []) {
      const assortment = position.assortment;
      if (!assortment) continue;

      const type = getAttr(assortment, 'Тип изделия');
      if (type !== 'Керагласс') continue;

      const name = assortment.name;

      if (!map.has(name)) {
        map.set(name, {
          name,
          qty: 0,
          sum: 0,
          m2: 0,
        });
      }

      const acc = map.get(name);

      acc.qty += position.quantity;
      acc.sum += calcPositionSum(position);
      acc.m2 += calcM2(position);
    }
  }

  return Array.from(map.values()).map(row => ({
    'Наименование': row.name,
    'Кол-во, шт': row.qty,
    'Объём, м²': Number(row.m2.toFixed(3)),
    'Сумма': Number(row.sum.toFixed(2)),
  }));
}

function buildOtherSheet(rows) {
  const map = new Map();

  for (const invoice of rows) {
    for (const position of invoice.positions?.rows || []) {
      const assortment = position.assortment;
      if (!assortment) continue;

      const type = getAttr(assortment, 'Тип изделия');

      // Всё, что не попало в специализированные листы
      if (type && EXCLUDED_TYPES.has(type)) continue;

      const name = assortment.name;

      if (!map.has(name)) {
        map.set(name, {
          name,
          qty: 0,
          sum: 0,
          m2: 0,
        });
      }

      const acc = map.get(name);

      acc.qty += position.quantity;
      acc.sum += calcPositionSum(position);
      acc.m2 += calcM2(position);
    }
  }

  return Array.from(map.values()).map(row => ({
    'Наименование': row.name,
    'Кол-во, шт': row.qty,
    'Объём, м²': Number(row.m2.toFixed(3)),
    'Сумма': Number(row.sum.toFixed(2)),
  }));
}

function buildTemperingSheet(rows) {
  const map = new Map();

  for (const invoice of rows) {
    for (const position of invoice.positions?.rows || []) {
      const assortment = position.assortment;
      if (!assortment) continue;

      const type = getAttr(assortment, 'Тип изделия');
      if (type !== 'Закалка стекла') continue;

      const thickness = extractThicknessMm(assortment.name);

      // если не смогли определить толщину — кладём в отдельную группу
      const key = thickness
        ? `Закалка давальческого стекла, ${thickness} мм`
        : 'Закалка давальческого стекла (толщина не указана)';

      if (!map.has(key)) {
        map.set(key, {
          name: key,
          qty: 0,
          sum: 0,
          m2: 0,
        });
      }

      const acc = map.get(key);

      acc.qty += position.quantity;
      acc.sum += calcPositionSum(position);
      acc.m2 += calcM2(position);
    }
  }

  return Array.from(map.values()).map(row => ({
    'Наименование': row.name,
    'Кол-во, шт': row.qty,
    'Объём, м²': Number(row.m2.toFixed(3)),
    'Сумма': Number(row.sum.toFixed(2)),
  }));
}

function buildSummarySheet(workbook) {
  const summary = [];

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;
    if (sheetName === 'Сводная') continue;

    const data = worksheetToJson(worksheet);

    if (sheetName === 'СМД') {
      // Суммируем позиции по сериям
      const seriesMap = new Map();
      let currentSeries = 'Без серии';

      for (const row of data) {
        if (!row['Наименование']) continue;

        // Если это заголовок серии, меняем currentSeries
        const seriesMatch = row['Наименование'].match(/^Серия: (.+)$/);
        if (seriesMatch) {
          currentSeries = seriesMatch[1];
          if (!seriesMap.has(currentSeries)) {
            seriesMap.set(currentSeries, { qty: 0, sum: 0, m2: 0 });
          }
          continue;
        }

        if (!seriesMap.has(currentSeries)) {
          seriesMap.set(currentSeries, { qty: 0, sum: 0, m2: 0 });
        }

        const acc = seriesMap.get(currentSeries);
        acc.qty += row['Кол-во, шт'] || 0;
        acc.sum += row['Сумма'] || 0;
        acc.m2 += row['Объём, м²'] || 0;
      }

      for (const [seriesName, values] of seriesMap.entries()) {
        summary.push({
          'Наименование': `СМД: ${seriesName}`,
          'Кол-во, шт': values.qty,
          'Объём, м²': Number(values.m2.toFixed(3)),
          'Сумма': Number(values.sum.toFixed(2)),
        });
      }
    } else {
      // Остальные листы — суммируем весь лист одной строкой
      const totals = data.reduce(
        (acc, row) => {
          acc.qty += row['Кол-во, шт'] || 0;
          acc.sum += row['Сумма'] || 0;
          acc.m2 += row['Объём, м²'] || 0;
          return acc;
        },
        { qty: 0, sum: 0, m2: 0 }
      );

      summary.push({
        'Наименование': sheetName,
        'Кол-во, шт': totals.qty,
        'Сумма': Number(totals.sum.toFixed(2)),
        'Объём, м²': Number(totals.m2.toFixed(3)),
      });
    }
  }

  return summary;
}


export default async function createReport({filters, broker}) {
  const { startDate, endDate } = filters;

  const urlBase =
    `https://api.moysklad.ru/api/remap/1.2/entity/invoiceout` +
    `?filter=` +
    `https://api.moysklad.ru/api/remap/1.2/entity/invoiceout/metadata/attributes/a38c0fc9-24c2-11f0-0a80-194c00046502>${startDate} 00:00:00;` +
    `https://api.moysklad.ru/api/remap/1.2/entity/invoiceout/metadata/attributes/a38c0fc9-24c2-11f0-0a80-194c00046502<${endDate} 23:59:59` +
    `&expand=positions.assortment`;

  const rows = await broker.call('proxy.fetchAllRows', { url: urlBase });

  const ordersUrl =
    `https://api.moysklad.ru/api/remap/1.2/entity/customerorder` +
    `?filter=` +
    `moment>${startDate} 00:00:00;moment<${endDate} 23:59:59;` +
    `agent=https://api.moysklad.ru/api/remap/1.2/entity/counterparty/c1c9d6d1-a0ea-11ef-0a80-0e1200509b38` +
    `&expand=positions.assortment`;
  const orderRows = await broker.call('proxy.fetchAllRows', { url: ordersUrl });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Askell';
  workbook.created = new Date();

  function sortByName(sheetData) {
    return sheetData.sort((a, b) => {
      if (!a['Наименование']) return 1;
      if (!b['Наименование']) return -1;
      return a['Наименование'].localeCompare(b['Наименование']);
    });
  }

  // Лист 1 — СМД
  const smdData = buildSmdSheet(rows);
  const smdSheet = addJsonSheet(workbook, 'СМД', smdData, [120, 10, 10, 14]);
  setMoneyFormatByColumn(smdSheet, 'Сумма', '₽');

  const smdOzonData = buildSmdSheet(orderRows);
  const smdOzonSheet = addJsonSheet(workbook, 'СМД Озон', smdOzonData, [120, 10, 10, 14]);
  setMoneyFormatByColumn(smdOzonSheet, 'Сумма', '₽');

  // Лист 2 — Цветное стекло (НЕ М1)
  const colorGlassData = sortByName(buildGlassSheet(rows, { isM1: false }));
  const colorGlassSheet = addJsonSheet(workbook, 'Цветное стекло', colorGlassData, [30, 10, 10, 10, 13]);
  setMoneyFormatByColumn(colorGlassSheet, 'Сумма', '₽');

  // Лист 3 — Стекло М1
  const m1GlassData = sortByName(buildGlassSheet(rows, { isM1: true }));
  const m1GlassSheet = addJsonSheet(workbook, 'Стекло М1', m1GlassData, [15, 10, 10, 10, 13]);
  setMoneyFormatByColumn(m1GlassSheet, 'Сумма', '₽');

  const triplexData = sortByName(buildTriplexSheet(rows));
  const triplexSheet = addJsonSheet(workbook, 'Триплекс', triplexData, [70, 10, 10, 10, 13]);
  setMoneyFormatByColumn(triplexSheet, 'Сумма', '₽');

  // Лист — Керагласс
  const keraglassData = sortByName(buildKeraglassSheet(rows));
  const keraglassSheet = addJsonSheet(workbook, 'Керагласс', keraglassData, [120, 10, 10, 13]);
  setMoneyFormatByColumn(keraglassSheet, 'Сумма', '₽');

  // Лист — Закалка стекла
  const temperingData = sortByName(buildTemperingSheet(rows));
  const temperingSheet = addJsonSheet(workbook, 'Закалка стекла', temperingData, [35, 10, 10, 13]);
  setMoneyFormatByColumn(temperingSheet, 'Сумма', '₽');

  const otherData = sortByName(buildOtherSheet(rows));
  const otherSheet = addJsonSheet(workbook, 'Остальное', otherData, [120, 10, 10, 13]);
  setMoneyFormatByColumn(otherSheet, 'Сумма', '₽');

  const summaryData = buildSummarySheet(workbook);
  const summarySheet = addJsonSheet(workbook, 'Сводная', summaryData, [30, 10, 10, 13]);
  setMoneyFormatByColumn(summarySheet, 'Сумма', '₽');

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
