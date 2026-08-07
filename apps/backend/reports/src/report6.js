import ExcelJS from 'exceljs'
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRAME_STAGE_NAME = 'Изготовление рамки';

export default async function createReport({ filters, ctx }) {
    const { orderNumber } = filters;

    const heaps = await ctx.call('data-refresher.getHeaps');
    const stock = await ctx.call('data-refresher.getEntity', { entity: 'stock' });

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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Askell';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet(`Заказ ${orderNumber}`);
    worksheet.columns = [
        { header: 'Наименование', key: 'Наименование', width: 60 },
        { header: 'Материал', key: 'Материал', width: 16 },
        { header: 'Статус', key: 'Статус', width: 60 },
    ];
    worksheet.getRow(1).font = { bold: true };

    if (!frameItems.length) {
        worksheet.addRow({ 'Наименование': `Элементы заказа №${orderNumber} на этапе «${FRAME_STAGE_NAME}» не найдены.` });
    } else {
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

        worksheet.addRows(rows);
        for (const rowNumber of boldRowNumbers) {
            worksheet.getRow(rowNumber).font = { bold: true };
        }
    }

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
