import Client from "./src/utils/got.js";
import dotenv from 'dotenv';
dotenv.config();
import * as XLSX from 'xlsx';

const urlBase = 'https://api.moysklad.ru/api/remap/1.2/entity/invoiceout?filter=https://api.moysklad.ru/api/remap/1.2/entity/invoiceout/metadata/attributes/a38c0fc9-24c2-11f0-0a80-194c00046502%20%3E=2025-04-01%2001:00:00;https://api.moysklad.ru/api/remap/1.2/entity/invoiceout/metadata/attributes/a38c0fc9-24c2-11f0-0a80-194c00046502%20%3C2025-04-30%2023:59:59&expand=positions.assortment';
const urlBaseOzon = 'https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=moment%3E2025-04-01%2001:00:00;moment%3C2025-04-30%2023:59:59;applicable=true;state!=https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/9118d36c-9302-11ed-0a80-08e10003a2e0;agent=https://api.moysklad.ru/api/remap/1.2/entity/counterparty/c1c9d6d1-a0ea-11ef-0a80-0e1200509b38&expand=positions.assortment';

const toRow = (item) => [
  item.glassKey,
  item.quantity,
  item.volume,
  item.price,
  item.amount,
];

const rows = await fetchAllRows(urlBase);
const rowsOzon = await fetchAllRows(urlBaseOzon);

const assortments = extractAndAggregateAssortments(rows);
const ozonBoards = extractBoardSubcategories(rowsOzon).ozonBoards;

exportToExcel(assortments, ozonBoards);

// === ОБРАБОТКА ОСНОВНЫХ ДАННЫХ ===

function extractAndAggregateAssortments(rows) {
  const categories = {
    boards: new Map(),
    color: new Map(),
    m1: new Map(),
    triplex: new Map(),
    other: new Map()
  };

  for (const row of rows) {
    for (const pos of row.positions.rows) {
      const { assortment, quantity = 0 } = pos;
      const name = assortment.name;
      const volume = +(assortment.volume || 0);
      const price = +(pos.price / 100 * (1 - (pos.discount ?? 0) / 100)).toFixed(2);
      const amount = +(price * quantity).toFixed(2);

      const glassKey = extractGlassTypeAndThickness(name);
      const category = classifyRow(name);
      const map = categories[category];

      if (!map.has(glassKey)) {
        map.set(glassKey, { glassKey, quantity: 0, volume: 0, amount: 0 });
      }

      const entry = map.get(glassKey);
      entry.quantity += quantity;
      entry.volume += volume * quantity;
      entry.amount = +(entry.amount + amount).toFixed(2);
    }
  }

  for (const map of Object.values(categories)) {
    for (const entry of map.values()) {
      entry.price = +(entry.amount / entry.quantity).toFixed(2);
    }
  }

  return categories;
}

function extractGlassTypeAndThickness(name) {
  const glassMatch = name.match(/Стекло,\s*(.+?),\s*([\d.,]+)\s*мм/i);
  if (glassMatch) return `${glassMatch[1].trim()} (${glassMatch[2].trim()} мм)`;

  const mirrorMatch = name.match(/Зеркало,\s*(.+?),\s*([\d.,]+)\s*мм/i);
  if (mirrorMatch) return `Зеркало ${mirrorMatch[1].trim()} (${mirrorMatch[2].trim()} мм)`;

  return name;
}

function classifyRow(name) {
  const lower = name.toLowerCase();
  if (lower.includes('доска')) return 'boards';
  if (lower.includes('триплекс') || lower.includes('керагл')) return 'triplex';
  if (/стекло,\s*м1\b/i.test(name)) return 'm1';
  if (/стекло,/i.test(name) || lower.includes('зеркало')) return 'color';
  return 'other';
}

// === ДОПОЛНИТЕЛЬНАЯ ОБРАБОТКА ДЛЯ OZON ===

function extractBoardSubcategories(rows) {
  const mobileBoards = [];
  const staticBoards = [];
  const ozonBoards = [];

  for (const row of rows) {
    for (const pos of row.positions.rows) {
      const name = pos.assortment.name;
      if (!name.toLowerCase().includes('доска')) continue;

      const quantity = pos.quantity || 0;
      const volume = +(pos.assortment.volume || 0);
      const price = +(pos.price / 100 * (1 - (pos.discount ?? 0) / 100)).toFixed(2);
      const amount = +(price * quantity).toFixed(2);
      const glassKey = extractGlassTypeAndThickness(name);

      ozonBoards.push({ glassKey, quantity, volume, price, amount });
    }
  }

  return { ozonBoards };
}

// === ЭКСПОРТ В EXCEL ===

function exportToExcel(categorizedData, ozonBoards, filename = 'отчет-стекло.xlsx') {
  const workbook = XLSX.utils.book_new();
  const sheetNames = {
    boards: 'Доска',
    color: 'Цветное стекло',
    m1: 'Стекло М1',
    triplex: 'Триплекс or Керагласс',
    other: 'Прочее'
  };

  for (const [key, map] of Object.entries(categorizedData)) {
    const data = Array.from(map.values());
    if (data.length === 0 && key !== 'boards') continue;

    const worksheetData = [['Тип стекла (с толщиной)', 'Кол-во', 'Объем', 'Средняя цена за шт', 'Сумма']];

    if (key === 'boards') {
      const boardRows = Array.from(map.values());

      const mobile = boardRows.filter(r => r.glassKey.toLowerCase().includes('мобильн'));
      const other = boardRows.filter(r => !r.glassKey.toLowerCase().includes('мобильн'));

      if (mobile.length > 0) {
        worksheetData.push(['— Мобильные доски —']);
        worksheetData.push(...mobile.map(toRow));
        worksheetData.push(['']);
      }

      if (other.length > 0) {
        worksheetData.push(['— Прочие доски —']);
        worksheetData.push(...other.map(toRow));
        worksheetData.push(['']);
      }

      if (ozonBoards.length > 0) {
        worksheetData.push(['— Ozon доски —']);
        worksheetData.push(...ozonBoards.map(toRow));
      }
    } else {
      worksheetData.push(...data.map(toRow));
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 120 },
      { wch: 6 },
      { wch: 13 },
      { wch: 17.5 },
      { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetNames[key] || key);
  }

  XLSX.writeFile(workbook, filename);
}

// === ПАГИНАЦИЯ ===

async function fetchAllRows(urlBase) {
  const limit = 100;
  const firstUrl = `${urlBase}&limit=${limit}&offset=0`;
  const firstResponse = await Client.sklad(firstUrl);
  if (!firstResponse.rows?.length) return [];

  const allRows = [...firstResponse.rows];
  const totalSize = firstResponse.meta?.size || allRows.length;

  const requests = [];
  for (let offset = limit; offset < totalSize; offset += limit) {
    requests.push(Client.sklad(`${urlBase}&limit=${limit}&offset=${offset}`));
  }

  const responses = await Promise.all(requests);
  for (const res of responses) {
    if (res.rows) allRows.push(...res.rows);
  }

  return allRows;
}
