import { google } from "googleapis";
import { dictionary } from "../services/sklad.service.js";
import Client from "../utils/got.js";
import ApiError from "../utils/apiError.js";

const SPREADSHEET_ID = "1S5Yj4pLprnFYsGc7rChtWT2_aCfDTttZkZro3MVaXu4";
const HEADERS = [
  '№ Заказа покупателя', 'Диапазон доставки, в днях', 'Вес груза', 
  'Вес самого большого места', 'Размер самого большого места', 'Груз упакован в', 'Позиции', 
  'Дата размещения заявки', 'Заявка от', 'Отправитель', 'Плательщик', 'Получатель', 
  'Отгрузка из', 'Адрес', 'Телефон', 'Время работы', 'Обед', 'Название ТК'
];

async function createSheetIfNotExists(sheets, title) {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetTitles = res.data.sheets.map(s => s.properties.title);

  let sheetId;
  if (!sheetTitles.includes(title)) {
    const batchRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
        includeSpreadsheetInResponse: true
      }
    });
    sheetId = batchRes.data.replies[0].addSheet.properties.sheetId;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] }
    });
  } else {
    const sheet = res.data.sheets.find(s => s.properties.title === title);
    sheetId = sheet.properties.sheetId;
  }

  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetId}`;
  return url;
}

function formatDateTime() {
  const now = new Date();
  const options = {
    timeZone: 'Asia/Yekaterinburg',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('ru-RU', options);
  return formatter.format(now).replace(',', '');
}

function prepareRow(order, dataFromForm, positionsData, attrs) {
  const positionsText = dataFromForm.positions?.trim() ? dataFromForm.positions : "Все позиции";
  return [
    order.name,
    dataFromForm.deliveryDays,
    positionsData.totalWeight,
    positionsData.heaviest,
    positionsData.size,
    positionsData.packing,
    positionsText,
    formatDateTime(),
    Object.values(dictionary.employees)?.find(el => el.uid == dataFromForm.requestFrom)?.name || '-',
    order.organization.name,
    '-',
    '-',
    order.store?.name || '-',
    attrs['Адрес получателя'],
    attrs['Телефон получателя'],
    dataFromForm.availableHours,
    dataFromForm.lunchBreak,
    attrs['Выбор транспортной компании']
  ];
}
async function appendRowToSheet(sheets, title, row) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${title}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

function calcPositions(order, filter) {
  let totalWeight = 0, heaviest = 0, largerPosition = null, packing = {};
  for (let i = 0; i < order.positions.rows.length; i++) {
    const position = order.positions.rows[i];
    const name = position.assortment.name.toLowerCase();

    if (name.includes('упаковка')) {
      name.includes('картон') && (packing['Картон'] = true);
      name.includes('ящик') && (packing['Ящик'] = true);
      name.includes('короб') && (packing['Короб'] = true);
    }
    let quantity = position.quantity
    if (filter) {
      const match = filter.find(f => f.index === i);
      if (!match) continue;
      quantity = match.quantity == null ? position.quantity : match.quantity;
    }
    const weight = (position.assortment?.weight * quantity) || 0
    totalWeight += weight;
    if (position.assortment.weight > heaviest) heaviest = position.assortment.weight;

    if (!largerPosition || position.assortment.volume > largerPosition.volume) {
      largerPosition = position.assortment;
    }
  }
  console.log(totalWeight)
  const attrs = (largerPosition?.attributes || []).reduce((a, x) => {
    a[x.name] = x.value; return a;
  }, {});
  const size = `${attrs['Длина в мм']}х${attrs['Ширина в мм']}`;
  return { totalWeight, heaviest, size, packing: Object.keys(packing).join(',') };
}

const logisticRequest = async (dataFromForm) => {
  const order = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${dataFromForm.id}?expand=positions.assortment,organization,store`);
  const attrs = (order?.attributes || []).reduce((a, x) => { a[x.name] = x.value; return a; }, {});

  if(!attrs['Вид доставки']?.name) throw new ApiError(404, 'Не указан вид доставки');
  if(attrs['Вид доставки']?.name == 'Самовывоз') throw new ApiError(404, 'Вид доставки самовывоз');
  const auth = new google.auth.GoogleAuth({
    keyFile: "../schedule-471508-c646e9809860.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  let filter = null;
  if (dataFromForm.positions?.trim()) {
    filter = dataFromForm.positions.split(',').map(item => {
      const [idx, qty] = item.split('-').map(s => parseInt(s, 10));
      return { index: idx - 1, quantity: qty || null };
    });
  }

  const targetDate = dataFromForm.targetDate;
  const deliveryType = attrs['Вид доставки'].name;
  const sheetTitle = `${deliveryType === 'До адреса' ? 'ЕКБ' : 'ТК'} ${targetDate}`;
  const sheetUrl = await createSheetIfNotExists(sheets, sheetTitle);

  const positionsData = calcPositions(order, filter);
  const row = prepareRow(order, dataFromForm, positionsData, attrs, deliveryType);
  await appendRowToSheet(sheets, sheetTitle, row);

  return {
    message: `Заказ ${order.name} успешно добавлен в лист "${sheetTitle}"`,
    url: sheetUrl
  };
}

export default logisticRequest;
