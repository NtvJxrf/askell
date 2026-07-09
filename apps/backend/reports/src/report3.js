//Отчет по счетам покупателей, с суммой за ГОД, группами, первая/последняя продажа, город, отсортирован по последнему году
import ExcelJS from 'exceljs';
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export default async function createReport ({filters, ctx}) {
  const { startDate, endDate } = filters

  function getYearsInRange(startDate, endDate) {
    const startYear = Number(startDate.slice(0, 4));
    const endYear = Number(endDate.slice(0, 4));

    return Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );
  }

  const years = getYearsInRange(startDate, endDate);

  /* ======================================================
    2. Загрузка счетов
  ====================================================== */

  const invoices = await ctx.call("proxy.fetchAllRows", {
    url: 'https://api.moysklad.ru/api/remap/1.2/entity/invoiceout' +
      `?filter=` +
      `moment>${startDate} 00:00:00;` +
      `moment<${endDate} 23:59:59;` +
      `state=https://api.moysklad.ru/api/remap/1.2/entity/invoiceout/metadata/states/afee4ff0-a99b-11e7-7a34-5acf0002b5e3;` +
      `state=https://api.moysklad.ru/api/remap/1.2/entity/invoiceout/metadata/states/cccafcde-a99b-11e7-6b01-4b1d00028f73` +
      `&expand=agent,positions.assortment`
  });

  /* ======================================================
    3. report/counterparty
  ====================================================== */

  const counterpartiesPayload = {
    counterparties: Array.from(
      new Map(
        invoices
          .map(inv => inv?.agent?.meta)
          .filter(Boolean)
          .map(meta => [meta.href, { counterparty: { meta } }])
      ).values()
    ),
  };

  const reportCounterpartys = await ctx.call("proxy.fetchAllRows", {
    url: 'https://api.moysklad.ru/api/remap/1.2/report/counterparty?expand=1234',
    method: 'post',
    data: counterpartiesPayload
  });

  const counterpartyReportMap = new Map(
    reportCounterpartys.map(r => [
      r.counterparty.meta.href,
      {
        firstDemandDate: r.firstDemandDate,
        lastDemandDate: r.lastDemandDate,
      },
    ])
  );

  /* ======================================================
    4. Вспомогательные функции
  ====================================================== */

  const getYear = moment => Number(moment.slice(0, 4));

  function getProductType(assortment) {
    if (!assortment?.attributes) return null;
    const attr = assortment.attributes.find(a => a.name === 'Тип изделия');
    return attr?.value ?? null;
  }

  function calcPositionSum(position) {
    const base = (position.price / 100) * position.quantity;
    const discountMultiplier = 1 - (position.discount ?? 0) / 100;
    return base * discountMultiplier;
  }

  /* ======================================================
    5. Универсальный агрегатор
  ====================================================== */

  function buildReport(productTypeFilter) {
    const map = new Map();

    for (const invoice of invoices) {
      const agent = invoice.agent;
      if (!agent?.meta?.href) continue;

      const year = getYear(invoice.moment);
      if (!years.includes(year)) continue;

      const agentKey = agent.meta.href;

      if (!map.has(agentKey)) {
        map.set(agentKey, {
          name: agent.name ?? '',
          city: agent.legalAddressFull?.city ?? '',
          priceType: agent.priceType?.name ?? '',
          tags: agent.tags?.join(' | ') ?? '',
          sales: Object.fromEntries(years.map(y => [y, 0])),
          firstDemandDate: null,
          lastDemandDate: null,
        });
      }

      const row = map.get(agentKey);

      for (const position of invoice.positions?.rows ?? []) {
        const productType = getProductType(position.assortment);
        if (!productTypeFilter(productType)) continue;

        row.sales[year] += calcPositionSum(position);
      }
    }

    for (const [key, row] of map.entries()) {
      const report = counterpartyReportMap.get(key);
      if (!report) continue;

      row.firstDemandDate = report.firstDemandDate;
      row.lastDemandDate = report.lastDemandDate;
    }

    const lastYear = years[years.length - 1];

    return Array.from(map.values())
      .filter(row => years.some(y => row.sales[y] !== 0))
      .sort((a, b) => b.sales[lastYear] - a.sales[lastYear])
      .map(row => {
        const result = {
          'Контрагент': row.name,
          'Город': row.city,
          'Тип цен': row.priceType,
          'Группы': row.tags,
        };

        for (const y of years) {
          result[`Продажи ${y}`] = row.sales[y];
        }

        result['Первая покупка'] = row.firstDemandDate?.slice(0, 10);
        result['Последняя покупка'] = row.lastDemandDate?.slice(0, 10);

        return result;
      });
  }

  /* ======================================================
    6. Формирование отчетов
  ====================================================== */

  const columnWidths = [50, 15, 10, 20, ...new Array(years.length).fill(14), 14, 14];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Askell';
  workbook.created = new Date();

  const smdReport = buildReport(type => type === 'СМД');
  const smdSheet = addJsonSheet(workbook, 'СМД', smdReport, columnWidths);
  setMoneyFormatByColumn(smdSheet, 'Продажи', '₽');

  const keraglassReport = buildReport(type => type === 'Керагласс');
  const keraglassSheet = addJsonSheet(workbook, 'Керагласс', keraglassReport, columnWidths);
  setMoneyFormatByColumn(keraglassSheet, 'Продажи', '₽');

  const glassTriplexReport = buildReport(type => type === 'Стекло' || type === 'Триплекс');
  const glassTriplexSheet = addJsonSheet(workbook, 'Стекло + Триплекс', glassTriplexReport, columnWidths);
  setMoneyFormatByColumn(glassTriplexSheet, 'Продажи', '₽');

  const tempering = buildReport(type => type === 'Закалка стекла');
  const temperingSheet = addJsonSheet(workbook, 'Закалка стекла', tempering, columnWidths);
  setMoneyFormatByColumn(temperingSheet, 'Продажи', '₽');

  const otherReport = buildReport(
    type => !type || !['СМД', 'Керагласс', 'Стекло', 'Триплекс', 'Закалка стекла'].includes(type)
  );
  const otherSheet = addJsonSheet(workbook, 'Прочее', otherReport, columnWidths);
  setMoneyFormatByColumn(otherSheet, 'Продажи', '₽');

  /* ======================================================
    7. XLSX
  ====================================================== */

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