import * as XLSX from 'xlsx';
//Отчет по счетам покупателей, с суммой за ГОД, группами, первая/последняя продажа, город, отсортирован по последнему году
export default async function createReport ({filters, broker}) {
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

  const invoices = await broker.call("fetchAllRows", {
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

  const reportCounterpartys = await broker.call("fetchAllRows", {
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

  function setColumnWidths(sheet, widths) {
    sheet['!cols'] = widths.map(w => ({ wch: w }));
  }

  const smdReport = buildReport(type => type === 'СМД');
  const smdSheet = XLSX.utils.json_to_sheet(smdReport)
  setColumnWidths(smdSheet, [50, 15, 10, 20, ...new Array(years.length).fill(14), 14, 14]);
  setMoneyFormatByColumn(smdSheet, 'Продажи', '₽');

  const keraglassReport = buildReport(type => type === 'Керагласс');
  const keraglassSheet = XLSX.utils.json_to_sheet(keraglassReport)
  setColumnWidths(keraglassSheet, [50, 15, 10, 20, ...new Array(years.length).fill(14), 14, 14]);
  setMoneyFormatByColumn(keraglassSheet, 'Продажи', '₽');

  const glassTriplexReport = buildReport(type => type === 'Стекло' || type === 'Триплекс');
  const glassTriplexSheet = XLSX.utils.json_to_sheet(glassTriplexReport)
  setColumnWidths(glassTriplexSheet, [50, 15, 10, 20, ...new Array(years.length).fill(14), 14, 14]);
  setMoneyFormatByColumn(glassTriplexSheet, 'Продажи', '₽');

  const tempering = buildReport(type => type === 'Закалка стекла');
  const temperingSheet = XLSX.utils.json_to_sheet(tempering)
  setColumnWidths(temperingSheet, [50, 15, 10, 20, ...new Array(years.length).fill(14), 14, 14]);
  setMoneyFormatByColumn(temperingSheet, 'Продажи', '₽');

  const otherReport = buildReport(
    type => !type || !['СМД', 'Керагласс', 'Стекло', 'Триплекс', 'Закалка стекла'].includes(type)
  );
  const otherSheet = XLSX.utils.json_to_sheet(otherReport)
  setColumnWidths(otherSheet, [50, 15, 10, 20, ...new Array(years.length).fill(14), 14, 14]);
  setMoneyFormatByColumn(otherSheet, 'Продажи', '₽');

  /* ======================================================
    7. XLSX
  ====================================================== */

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, smdSheet, 'СМД');
  XLSX.utils.book_append_sheet(wb, keraglassSheet, 'Керагласс');
  XLSX.utils.book_append_sheet(wb, glassTriplexSheet, 'Стекло + Триплекс');
  XLSX.utils.book_append_sheet(wb, temperingSheet, 'Закалка стекла');
  XLSX.utils.book_append_sheet(wb, otherSheet, 'Прочее');


  const buffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'buffer',
  });
  return buffer
}