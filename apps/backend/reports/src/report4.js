import ExcelJS from 'exceljs'
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAttr(assortment, attrName) {
  return assortment?.attributes?.find(a => a.name === attrName)?.value;
}

function extractThicknessMm(name) {
  const match = name?.match(/(\d+(?:[.,]\d+)?)\s*мм/i);
  return match ? match[1] : '';
}

function calcM2PerItem(assortment) {
  const lengthMm = getAttr(assortment, 'Длина в мм');
  const widthMm = getAttr(assortment, 'Ширина в мм');

  if (!lengthMm || !widthMm) return 0;

  return (lengthMm / 1000) * (widthMm / 1000);
}

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
  const matchingCols = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (cell.value && String(cell.value).includes(columnName)) {
      matchingCols.push(colNumber);
    }
  });

  if (matchingCols.length === 0) return;

  for (const colIndex of matchingCols) {
    worksheet.getColumn(colIndex).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      if (typeof cell.value === 'number') {
        cell.numFmt = `#,##0.00 "${currencySymbol}"`;
      }
    });
  }
}

function buildTemperingSheet(orders) {
  const sheetData = [];
  const grandTotal = { qty: 0, m2: 0, sum: 0 };

  for (const order of orders) {
    const positions = (order.positions?.rows || []).filter(
      position => getAttr(position.assortment, 'Тип изделия') === 'Закалка стекла'
    );

    if (!positions.length) continue;

    sheetData.push({ 'Наименование': `Заказ №${order.name}` });

    const orderTotal = { qty: 0, m2: 0, sum: 0 };

    for (const position of positions) {
      const assortment = position.assortment;
      const m2PerItem = calcM2PerItem(assortment);
      const qty = position.quantity;
      const m2Total = m2PerItem * qty;
      const sum = calcPositionSum(position);

      sheetData.push({
        'Наименование': assortment?.name,
        'Толщина, мм': extractThicknessMm(assortment?.name),
        'м2 1 детали': Number(m2PerItem.toFixed(3)),
        'Кол-во, шт': qty,
        'Сумма м2': Number(m2Total.toFixed(3)),
        'Сумма, ₽': Number(sum.toFixed(2)),
      });

      orderTotal.qty += qty;
      orderTotal.m2 += m2Total;
      orderTotal.sum += sum;
    }

    sheetData.push({
      'Наименование': 'Итого по заказу',
      'Кол-во, шт': orderTotal.qty,
      'Сумма м2': Number(orderTotal.m2.toFixed(3)),
      'Сумма, ₽': Number(orderTotal.sum.toFixed(2)),
    });
    sheetData.push({});

    grandTotal.qty += orderTotal.qty;
    grandTotal.m2 += orderTotal.m2;
    grandTotal.sum += orderTotal.sum;
  }

  sheetData.push({
    'Наименование': 'ИТОГО',
    'Кол-во, шт': grandTotal.qty,
    'Сумма м2': Number(grandTotal.m2.toFixed(3)),
    'Сумма, ₽': Number(grandTotal.sum.toFixed(2)),
  });

  return sheetData;
}

export default async function createReport({ filters, broker }) {
    const { startDate, endDate } = filters;
    const orders = await broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=moment>${startDate} 00:00:00;moment<${endDate} 23:59:59;state.name=Готово;state.name=Отгружен&expand=positions.assortment`});

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Askell';
    workbook.created = new Date();

    const temperingData = buildTemperingSheet(orders);
    const temperingSheet = addJsonSheet(workbook, 'Давальческая закалка', temperingData, [40, 12, 12, 10, 12, 14]);
    setMoneyFormatByColumn(temperingSheet, 'Сумма, ₽', '₽');
    temperingSheet.getRow(1).font = { bold: true };

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