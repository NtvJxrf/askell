import ExcelJS from 'exceljs'
import { valkey } from "@askell/shared";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default async function createReport({ filters, ctx }) {
    const { startDate, endDate } = filters;
    const completes = await ctx.call('proxy.fetchAllRows', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productionstagecompletion?filter=moment>${startDate} 00:00:00;moment<${endDate} 23:59:59&expand=productionStage`});
    const employees = JSON.parse(await valkey.get('sklad:data:employees'));
    const stages = JSON.parse(await valkey.get('sklad:data:processingStages'));
    const productionRowCache = new Map();
    const result = await Promise.all(
        completes.map(async el => {
            const ownerId = el.owner.meta.href.split('/').at(-1);
            const owner = employees[ownerId];
            const performer = el.attributes?.find(attr => attr.name === 'Выполнил')?.value;

            const stageHref = el.productionStage.stage.meta.href;
            const stageName = Object.entries(stages).find(([, value]) => value.meta.href === stageHref)?.[0];

            const href = `${el.productionStage.productionRow.meta.href}?expand=processingPlan.products.assortment`;

            if (!productionRowCache.has(href)) {
                productionRowCache.set(href, ctx.call('proxy.sklad', { url: href }));
            }

            const productionRow = await productionRowCache.get(href);
            const assortment = productionRow.processingPlan?.products?.rows[0]?.assortment;
            const attrs = (assortment?.attributes || []).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
            }, {});
            return {
                owner: performer || owner?.name,
                stageName,
                assortment: assortment?.name,
                thickness: Number(attrs['Материал 1']?.match(/(\d+(?:[.,]\d+)?)\s*мм/i)?.[1]) || '',
                S: ((attrs['Длина в мм'] || 0) * (attrs['Ширина в мм'] || 0) / 1_000_000) * el.productionVolume,
                P: (((attrs['Длина в мм'] || 0) + (attrs['Ширина в мм'] || 0)) * 2 / 1000) * el.productionVolume,
                drills: (attrs['Кол-во сверлений'] || 0) * el.productionVolume,
                zenk: (attrs['Кол-во зенковок'] || 0) * el.productionVolume,
                cutsv1: (attrs['Кол-во вырезов 1 категорий'] || 0) * el.productionVolume,
                cutsv2: (attrs['Кол-во вырезов 2 категорий'] || 0) * el.productionVolume,
                cutsv3: (attrs['Кол-во вырезов 3 категорий'] || 0) * el.productionVolume,
                quantity: el.productionVolume,
                date: el.moment.split(' ')[0],
                time: el.moment.split(' ')[1],
                productionStageCompletionName: el.name,
                productionTaskName: productionRow.name
            };
        })
    );
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Aaskell';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('completion');
    worksheet.columns = [
        { header: 'Исполнитель', key: 'owner' },
        { header: 'Этап', key: 'stageName' },
        { header: 'Изделие', key: 'assortment' },
        { header: 'Толщина, мм', key: 'thickness' },
        { header: 'Площадь', key: 'S' },
        { header: 'Периметр', key: 'P' },
        { header: 'Сверления', key: 'drills' },
        { header: 'Зенковки', key: 'zenk' },
        { header: 'Вырезы 1', key: 'cutsv1' },
        { header: 'Вырезы 2', key: 'cutsv2' },
        { header: 'Вырезы 3', key: 'cutsv3' },
        { header: 'Количество', key: 'quantity' },
        { header: 'Дата', key: 'date' },
        { header: 'Время', key: 'time' },
        { header: 'Завершение этапа', key: 'productionStageCompletionName' },
        { header: 'Производственное задание', key: 'productionTaskName' }
    ];

    worksheet.addRows(result);
    worksheet.getRow(1).font = {
        bold: true
    };
    const lastColumn = worksheet.getColumn(worksheet.columns.length).letter;
    worksheet.autoFilter = {
        from: 'A1',
        to: `${lastColumn}1`
    };
    worksheet.columns.forEach(column => {
        let maxLength = column.header.length;

        column.eachCell({ includeEmpty: true }, cell => {
            const value = cell.value?.toString() ?? '';
            maxLength = Math.max(maxLength, value.length);
        });

        column.width = Math.min(maxLength + 2, 50);
    });
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