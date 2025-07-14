import Client from "../utils/got.js";
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';
const urlBase = 'https://api.moysklad.ru/api/remap/1.2/entity/demand?filter=moment%3E2025-06-01%2001:00:00;moment%3C2025-06-30%2023:59:59;owner=https://api.moysklad.ru/api/remap/1.2/entity/employee/7d367f48-05e9-11e6-7a69-8f550000df87;owner=https://api.moysklad.ru/api/remap/1.2/entity/employee/03579653-eedf-11e8-9107-50480000f34d&expand=positions.assortment';

const rows = await fetchAllRows(urlBase);
const knownSeries = ['lux', 'krystal', 'round', 'standart', 'triangle', 'hexagon', 'premium', 'size', 'mobile'];
const assortments = extractAndAggregateAssortments(rows);
exportToExcel(assortments);
function extractAndAggregateAssortments(rows) {
  const getAttribute = (attributes, name) =>
    attributes?.find(attr => attr.name === name)?.value;

  const map = new Map();

  for (const row of rows) {
    for (const pos of row.positions.rows) {
        const assortment = pos.assortment;
        const attributes = assortment.attributes || [];

        const name = assortment.name;
        const series = getAttribute(attributes, 'Серия') || extractSeriesFromName(name, knownSeries) || '-'
        const lengthMm = parseFloat(getAttribute(attributes, 'Длина в мм')) || 0;
        const widthMm = parseFloat(getAttribute(attributes, 'Ширина в мм')) || 0;
        const size = `${lengthMm}*${widthMm}`;

        const areaPerPiece = +(lengthMm * widthMm / 1_000_000).toFixed(2);
        const quantity = pos.quantity || 0;

        const basePrice = pos.price / 100;
        const discount = pos.discount ?? 0;
        const price = +(basePrice * (1 - discount / 100)).toFixed(2);
        const amount = +(price * quantity).toFixed(2);
        const totalArea = +(areaPerPiece * quantity).toFixed(2);

        const key = `${name}|${series}|${size}`;
        if (!map.has(key)) {
            map.set(key, {
            name,
            size,
            series,
            quantity: 0,
            price,
            amount: 0,
            areaPerPiece,
            totalArea: 0,
            });
        }

        const entry = map.get(key);
        entry.quantity += quantity;
        entry.amount = +(entry.amount + amount).toFixed(2);
        entry.totalArea = +(entry.totalArea + totalArea).toFixed(4);
    }
  }

  return Array.from(map.values());
}

function extractSeriesFromName(name, knownSeries) {
  const lowerName = name.toLowerCase();
  for (const series of knownSeries) {
    if (lowerName.includes(series.toLowerCase())) {
      return series;
    }
  }
  return '–'; // если не найдена
}

function exportToExcel(data, filename = 'отчет.xlsx') {
  const worksheetData = [
    ['Наименование', 'Количество', 'Цена', 'Сумма', 'Площадь на шт', 'Общая площадь', 'Серия', 'Размер'],
    ...data.map(item => [
      item.name,
      item.quantity,
      item.price,
      item.amount,
      item.areaPerPiece,
      item.totalArea,
      item.series,
      item.size,
    ])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');

  XLSX.writeFile(workbook, filename);
}

async function fetchAllRows(urlBase) {
  const limit = 100;
  const firstUrl = `${urlBase}&limit=${limit}&offset=0`;
  const firstResponse = await Client.sklad(firstUrl);

  if (!firstResponse.rows || firstResponse.rows.length === 0) {
    return [];
  }

  const allRows = [...firstResponse.rows];
  const totalSize = firstResponse.meta?.size || allRows.length;

  const requests = [];
  for (let offset = limit; offset < totalSize; offset += limit) {
    const url = `${urlBase}&limit=${limit}&offset=${offset}`;
    requests.push(Client.sklad(url));
  }

  const responses = await Promise.all(requests);
  for (const res of responses) {
    if (res.rows) {
      allRows.push(...res.rows);
    }
  }

  return allRows;
}