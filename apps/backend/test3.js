import { ServiceBroker } from 'moleculer';
import '@askell/shared/env';
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRAME_STAGE_NAME = 'Изготовление рамки';

const orderNumber = process.argv[2];
if (!orderNumber) {
    console.error('Использование: node test3.js <номер заказа покупателя>');
    process.exit(1);
}

const broker = new ServiceBroker({ nodeID: 'test', transporter: 'nats://localhost:4222', logger: false });
await broker.start();
await broker.waitForServices(['data-refresher']);

const heaps = await broker.call('data-refresher.getHeaps');
const stock = await broker.call('data-refresher.getEntity', { entity: 'stock' });

// Название материала: сначала ищем в кучах (там оно есть, пока материал ещё в производстве),
// и только если там не нашли — берём из stock (значит он уже готов и лежит на складе).
function getMaterialName(materialId) {
    for (const heap of Object.values(heaps)) {
        const found = heap.find(item => item.assortmentId === materialId);
        if (found) return found.name;
    }
    return stock[materialId]?.name;
}

// Материал "готово полностью", если ни одного его экземпляра не осталось ни в одной куче
// (значит он уже прошёл производство); иначе расписываем по стадиям, где сколько ещё лежит.
function getMaterialStatus(materialId) {
    const byStage = {};
    for (const [stageName, heap] of Object.entries(heaps)) {
        for (const item of heap) {
            if (item.assortmentId === materialId) {
                byStage[stageName] = (byStage[stageName] || 0) + 1;
            }
        }
    }
    const stages = Object.entries(byStage);
    if (stages.length) return stages.map(([stageName, count]) => `${stageName}: ${count} шт`).join('; ');
    // в куче не осталось ни одного экземпляра — готовность подтверждаем наличием на складе
    return stock[materialId]?.total > 0 ? 'Готово полностью' : 'Не найдено ни в куче, ни на складе';
}

const frameItems = (heaps[FRAME_STAGE_NAME] || []).filter(
    item => item?.taskAttrs?.['№ заказа покупателя'] === orderNumber
);

if (!frameItems.length) {
    console.log(`Элементы заказа №${orderNumber} на этапе «${FRAME_STAGE_NAME}» не найдены.`);
    await broker.stop();
    process.exit(0);
}

// Каждый физический экземпляр изделия лежит в куче отдельной записью — объединяем их по assortmentId.
const groupedItems = new Map();
for (const item of frameItems) {
    const group = groupedItems.get(item.assortmentId);
    if (group) group.count++;
    else groupedItems.set(item.assortmentId, { item, count: 1 });
}

const rows = [];
const boldRowNumbers = [];
for (const { item, count } of groupedItems.values()) {
    const currentStage = item.productionPath?.find(ps => ps.productionStageId === item.productionStageId);
    const materials = currentStage?.materials || {};
    const materialIds = Object.keys(materials);

    const glassMaterialIds = materialIds.filter(materialId => {
        const name = getMaterialName(materialId)?.toLowerCase() || '';
        return name.includes('пф') && name.includes('стекло');
    });

    boldRowNumbers.push(rows.length + 2); // +1 за заголовок, +1 т.к. addRow нумерует с 1
    rows.push({ 'Наименование': `${item.name} (${count} шт)`, 'Материал': '', 'Статус': '' });

    if (!glassMaterialIds.length) {
        rows.push({ 'Наименование': '', 'Материал': '—', 'Статус': 'Нет материалов «ПФ Стекло»' });
    } else {
        glassMaterialIds.forEach(materialId => {
            rows.push({ 'Наименование': '', 'Материал': getMaterialName(materialId), 'Статус': getMaterialStatus(materialId) });
        });
    }
}

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet(`Заказ ${orderNumber}`);
worksheet.columns = [
    { header: 'Наименование', key: 'Наименование', width: 60 },
    { header: 'Материал', key: 'Материал', width: 16 },
    { header: 'Статус', key: 'Статус', width: 60 },
];
worksheet.addRows(rows);
worksheet.getRow(1).font = { bold: true };
for (const rowNumber of boldRowNumbers) {
    worksheet.getRow(rowNumber).font = { bold: true };
}

const fileName = path.join(__dirname, `order_${orderNumber}_рамка.xlsx`);
await workbook.xlsx.writeFile(fileName);
console.log(`Сохранено ${groupedItems.size} элементов в файл ${fileName}`);

await broker.stop();