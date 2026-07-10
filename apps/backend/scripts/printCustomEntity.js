import { ServiceBroker } from 'moleculer';
import '@askell/shared/env';
import got from 'got';
import { valkey, simulation } from '@askell/shared';
const BASE = process.env.API_URL || 'http://localhost:6789';
import { randomUUID } from 'crypto';
import ExcelJS from 'exceljs'
const api = got.extend({
  prefixUrl: BASE,
  throwHttpErrors: true, // we assert on statusCode ourselves
  responseType: 'json',
  timeout: { request: 30_000 },
});

const broker = new ServiceBroker({ nodeID: 'test', transporter: 'nats://localhost:4222', logger: false });
await broker.start();
await broker.waitForServices(['users', 'proxy']);


const customEntities = await broker.call('proxy.sklad', { url: 'https://api.moysklad.ru/api/remap/1.2/context/companysettings/metadata'})

const dict = customEntities.customEntities.find(el => el.name === 'Цены и коэффициенты')
if(!dict){
    console.error('dict not found')
    process.exit(0)
}
const rows = await broker.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customentity/${dict.id}?` }).then(res => res.sort((a, b) => a.name.localeCompare(b.name)));

function formatAttributeValue(value) {
    if (value == null) return '';
    if (typeof value === 'object') return value.name ?? JSON.stringify(value);
    return value;
}

// Собираем список колонок-атрибутов в порядке их первого появления
const attributeNames = [];
for (const row of rows) {
    for (const attr of row.attributes ?? []) {
        if (!attributeNames.includes(attr.name)) attributeNames.push(attr.name);
    }
}

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet(dict.name);

worksheet.columns = [
    { header: 'Название', key: 'name', width: 40 },
    ...attributeNames.map(name => ({ header: name, key: name, width: 15 })),
];

for (const row of rows) {
    const rowData = { name: row.name };
    for (const attr of row.attributes ?? []) {
        rowData[attr.name] = formatAttributeValue(attr.value);
    }
    worksheet.addRow(rowData);
}

worksheet.getRow(1).font = { bold: true };

const fileName = `${dict.name.replace(/[\\/:*?"<>|]/g, '_')}.xlsx`;
await workbook.xlsx.writeFile(fileName);
console.log(`Сохранено ${rows.length} строк в файл ${fileName}`);

await broker.stop();
