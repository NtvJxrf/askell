import Client from "./src/utils/got.js";
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';

export default async function createReport() {
    const urlBase = `https://api.moysklad.ru/api/remap/1.2/entity/invoiceout?filter=state.name=Оплачено;state.name=Предоплата;moment>2024-01-01;moment<2025-07-29&expand=positions.assortment,agent`

    const rows = await fetchAllRows(urlBase);
    exportToExcel(rows);
}
createReport()
function exportToExcel(rows) {
  const grouped = processDataWithMonths(rows);

  // Список месяцев с 2024-01 по 2025-07
  const monthHeaders = [];
  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (key >= '2024-01' && key <= '2025-07') {
        monthHeaders.push(key);
      }
    }
  }

  const header = ["контрагент", "продукт", ...monthHeaders];
  const data = [header];

  for (const record of grouped.values()) {
    const row = [record.agent, record.group];
    for (const m of monthHeaders) {
      row.push((record.months[m] || 0).toFixed(2));
    }
    data.push(row);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Отчёт");
  XLSX.writeFile(workbook, "report.xlsx");
}



function processDataWithMonths(rows) {
  const groupKeywords = [
    { key: "Смарт", label: "смарт" },
    { key: "Кера", label: "кера" },
    { key: "Триплекс", label: "триплекс" },
    { key: "ceraglass", label: "ceraglass" }
  ];

  const result = new Map();

  for (const item of rows) {
    const agentName = item.agent?.name || "Без имени";
    const positions = item.positions?.rows || [];
    const moment = item.moment;

    if (!moment) continue;

    const date = new Date(moment);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`; // например "2024-07"

    for (const pos of positions) {
      const name = pos.assortment?.name || "";
      const quantity = pos.quantity || 0;
      const price = (pos.price || 0) / 100;
      const discount = pos.discount || 0;
      const total = quantity * price * (1 - discount / 100);

      const group = groupKeywords.find(g => name.toLowerCase().includes(g.key.toLowerCase()));
      if (!group) continue;

      const mapKey = `${agentName}|${group.label}`;
      if (!result.has(mapKey)) result.set(mapKey, { agent: agentName, group: group.label, months: {} });

      const record = result.get(mapKey);
      record.months[monthKey] = (record.months[monthKey] || 0) + total;
    }
  }

  return result;
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
