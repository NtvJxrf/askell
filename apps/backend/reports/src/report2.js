import * as XLSX from 'xlsx';
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

function setMoneyFormatByColumn(sheet, columnName, currencySymbol = '₽') {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headerRow = 0; // обычно заголовки в первой строке

  // Находим все индексы колонок, где заголовок содержит columnName
  const matchingCols = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: C });
    const cell = sheet[cellAddress];
    if (cell && cell.v.includes(columnName)) {
      matchingCols.push(C);
    }
  }

  if (matchingCols.length === 0) return; // нет колонок с таким названием

  // Применяем денежный формат ко всем найденным колонкам, кроме заголовка
  for (const colIndex of matchingCols) {
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: colIndex });
      const cell = sheet[cellAddress];
      if (cell && typeof cell.v === 'number') {
        cell.z = `#,##0.00 "${currencySymbol}"`;
      }
    }
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

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Сводная') continue;

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

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

  const workbook = XLSX.utils.book_new();

  function setColumnWidths(sheet, widths) {
    sheet['!cols'] = widths.map(w => ({ wch: w }));
  }

  function sortByName(sheetData) {
    return sheetData.sort((a, b) => {
      if (!a['Наименование']) return 1;
      if (!b['Наименование']) return -1;
      return a['Наименование'].localeCompare(b['Наименование']);
    });
  }

  // Лист 1 — СМД
  const smdData = buildSmdSheet(rows);
  const smdSheet = XLSX.utils.json_to_sheet(smdData);
  XLSX.utils.book_append_sheet(workbook, smdSheet, 'СМД');
  setColumnWidths(smdSheet, [120, 10, 10, 14]);
  setMoneyFormatByColumn(smdSheet, 'Сумма', '₽');

  const smdOzonData = buildSmdSheet(orderRows);
  const smdOzonSheet = XLSX.utils.json_to_sheet(smdOzonData);
  XLSX.utils.book_append_sheet(workbook, smdOzonSheet, 'СМД Озон');
  setColumnWidths(smdOzonSheet, [120, 10, 10, 14]);
  setMoneyFormatByColumn(smdOzonSheet, 'Сумма', '₽');

  // Лист 2 — Цветное стекло (НЕ М1)
  const colorGlassData = sortByName(buildGlassSheet(rows, { isM1: false }));
  const colorGlassSheet = XLSX.utils.json_to_sheet(colorGlassData);
  XLSX.utils.book_append_sheet(workbook, colorGlassSheet, 'Цветное стекло');
  setColumnWidths(colorGlassSheet, [30, 10, 10, 10, 13]);
  setMoneyFormatByColumn(colorGlassSheet, 'Сумма', '₽');

  // Лист 3 — Стекло М1
  const m1GlassData = sortByName(buildGlassSheet(rows, { isM1: true }));
  const m1GlassSheet = XLSX.utils.json_to_sheet(m1GlassData);
  XLSX.utils.book_append_sheet(workbook, m1GlassSheet, 'Стекло М1');
  setColumnWidths(m1GlassSheet, [15, 10, 10, 10, 13]);
  setMoneyFormatByColumn(m1GlassSheet, 'Сумма', '₽');

  const triplexData = sortByName(buildTriplexSheet(rows));
  const triplexSheet = XLSX.utils.json_to_sheet(triplexData);
  XLSX.utils.book_append_sheet(workbook, triplexSheet, 'Триплекс');
  setColumnWidths(triplexSheet, [70, 10, 10, 10, 13]);
  setMoneyFormatByColumn(triplexSheet, 'Сумма', '₽');

  // Лист — Керагласс
  const keraglassData = sortByName(buildKeraglassSheet(rows));
  const keraglassSheet = XLSX.utils.json_to_sheet(keraglassData);
  XLSX.utils.book_append_sheet(workbook, keraglassSheet, 'Керагласс');
  setColumnWidths(keraglassSheet, [120, 10, 10, 13]);
  setMoneyFormatByColumn(keraglassSheet, 'Сумма', '₽');

  // Лист — Закалка стекла
  const temperingData = sortByName(buildTemperingSheet(rows));
  const temperingSheet = XLSX.utils.json_to_sheet(temperingData);
  XLSX.utils.book_append_sheet(workbook, temperingSheet, 'Закалка стекла');
  setColumnWidths(temperingSheet, [35, 10, 10, 13]);
  setMoneyFormatByColumn(temperingSheet, 'Сумма', '₽');

  const otherData = sortByName(buildOtherSheet(rows));
  const otherSheet = XLSX.utils.json_to_sheet(otherData);
  XLSX.utils.book_append_sheet(workbook, otherSheet, 'Остальное');
  setColumnWidths(otherSheet, [120, 10, 10, 13]);
  setMoneyFormatByColumn(otherSheet, 'Сумма', '₽');

  const summaryData = buildSummarySheet(workbook);
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводная');
  setColumnWidths(summarySheet, [30, 10, 10, 13]);
  setMoneyFormatByColumn(summarySheet, 'Сумма', '₽');

  const buffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer',
  });

  return buffer;
}
