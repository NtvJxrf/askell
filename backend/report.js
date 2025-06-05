import Client from "./src/utils/got.js";
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';
import fs from 'fs';

const urlBase = 'https://api.moysklad.ru/api/remap/1.2/entity/demand?filter=moment%3E2024-01-01%2001:00:00;moment%3C2024-12-31%2023:59:59;owner=https://api.moysklad.ru/api/remap/1.2/entity/employee/7d367f48-05e9-11e6-7a69-8f550000df87;owner=https://api.moysklad.ru/api/remap/1.2/entity/employee/03579653-eedf-11e8-9107-50480000f34d&expand=positions.assortment';

const rows = await fetchAllRows(urlBase);
const sortedAssortments = extractAndSortAssortments(rows);
exportToExcel(sortedAssortments);

function extractAndSortAssortments(rows) {
  const getAttribute = (attributes, name) => {
    return attributes?.find(attr => attr.name === name)?.value;
  };

  const assortments = [];

  for (const row of rows) {
    for (const pos of row.positions.rows) {
      const month = extractMonthKey(row.moment);
      const assortment = pos.assortment;
      const attributes = assortment.attributes;

      const size = getAttribute(attributes, 'Размер') || '0*0';
      const series = getAttribute(attributes, 'Серия') || 'undefined';
      const lengthMm = parseFloat(getAttribute(attributes, 'Длина в мм')) || 0;
      const widthMm = parseFloat(getAttribute(attributes, 'Ширина в мм')) || 0;

      const areaPerPiece = (lengthMm * widthMm) / 1_000_000; // м2
      const quantity = pos.quantity || 1;

      const basePrice = pos.price / 100;
      const discount = pos.discount ?? 0;
      const price = basePrice * (1 - discount / 100);

      assortments.push({
        name: assortment.name,
        size,
        series,
        quantity,
        price,
        areaPerPiece,
        month,
      });
    }
  }

  return assortments;
}

function exportToExcel(assortments, filename = 'report.xlsx') {
  const grouped = {};

  for (const item of assortments) {
    const { month, size, series } = item;
    if (!grouped[month]) grouped[month] = {};
    if (!grouped[month][size]) grouped[month][size] = {};
    if (!grouped[month][size][series]) grouped[month][size][series] = [];
    grouped[month][size][series].push(item);
  }

  const workbook = XLSX.utils.book_new();

  for (const month of Object.keys(grouped)) {
    const data = [];

    let monthTotalQty = 0;
    let monthTotalArea = 0;
    let monthTotalSum = 0;

    for (const size of Object.keys(grouped[month])) {
      // Добавляем строку с размером — только размер, остальные пустые
      data.push({ Размер: size, Серия: "", Название: "", Количество: "", Цена_за_шт: "", Площадь_на_шт_м2: "", Общая_площадь_м2: "", Сумма: "" });

      let sizeTotalQty = 0;
      let sizeTotalArea = 0;
      let sizeTotalSum = 0;

      for (const series of Object.keys(grouped[month][size])) {
        let seriesTotalQty = 0;
        let seriesTotalArea = 0;
        let seriesTotalSum = 0;

        // Переменная, чтобы серия выводилась только в первой строке блока
        let firstInSeries = true;

        for (const item of grouped[month][size][series]) {
          const qty = item.quantity;
          const area = item.areaPerPiece * qty;
          const sum = item.price * qty;

          data.push({
            Размер: "",
            Серия: firstInSeries ? series : "",
            Название: item.name,
            Количество: qty,
            Цена_за_шт: item.price.toFixed(2),
            Площадь_на_шт_м2: item.areaPerPiece.toFixed(3),
            Общая_площадь_м2: area.toFixed(3),
            Сумма: sum.toFixed(2),
          });

          firstInSeries = false;

          seriesTotalQty += qty;
          seriesTotalArea += area;
          seriesTotalSum += sum;
        }

        // Итог по серии (пишем серию пусто)
        data.push({
          Размер: "",
          Серия: "",
          Название: `ИТОГО по серии`,
          Количество: seriesTotalQty,
          Площадь_на_шт_м2: "",
          Общая_площадь_м2: seriesTotalArea.toFixed(3),
          Сумма: seriesTotalSum.toFixed(2),
        });

        sizeTotalQty += seriesTotalQty;
        sizeTotalArea += seriesTotalArea;
        sizeTotalSum += seriesTotalSum;
      }

      // Итог по размеру
      data.push({
        Размер: "",
        Серия: "",
        Название: `🔷 ИТОГО по размеру`,
        Количество: sizeTotalQty,
        Площадь_на_шт_м2: "",
        Общая_площадь_м2: sizeTotalArea.toFixed(3),
        Сумма: sizeTotalSum.toFixed(2),
      });

      monthTotalQty += sizeTotalQty;
      monthTotalArea += sizeTotalArea;
      monthTotalSum += sizeTotalSum;
    }

    // Итог по месяцу
    data.push({
      Размер: "",
      Серия: "",
      Название: `🔷🔷 ИТОГО по месяцу ${month}`,
      Количество: monthTotalQty,
      Площадь_на_шт_м2: "",
      Общая_площадь_м2: monthTotalArea.toFixed(3),
      Сумма: monthTotalSum.toFixed(2),
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: false });
    worksheet['!cols'] = [
      { wch: 10 }, // Размер
      { wch: 10 }, // Серия
      { wch: 90 }, // Название
      { wch: 10 }, // Количество
      { wch: 12 }, // Цена_за_шт
      { wch: 15 }, // Площадь_на_шт_м2
      { wch: 15 }, // Общая_площадь_м2
      { wch: 15 }, // Сумма
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, month);
  }

  XLSX.writeFile(workbook, filename);
}




function extractMonthKey(isoDateString) {
  const date = new Date(isoDateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function fetchAllRows(urlBase) {
  const allRows = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${urlBase}&limit=${limit}&offset=${offset}`;
    const response = await Client.sklad(url);

    if (!response.rows || response.rows.length === 0) break;

    allRows.push(...response.rows);

    if (response.rows.length < limit) break;

    offset += limit;
  }

  return allRows;
}
