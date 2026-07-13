import { Errors } from "moleculer";
import { valkey } from "@askell/shared";
import { createBroker } from "../lib/broker.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import price from "./src/price.js"
import report1 from "./src/report1.js";
import report2 from "./src/report2.js";
import report3 from "./src/report3.js";
import report4 from "./src/report4.js";
const { MoleculerClientError } = Errors;
const broker = createBroker("reports");
export const map = {
    price: {
        function: price,
        name: 'Прайс',
        description: 'Без описания',
        ttl: 12 * 60 * 60, // 12 часов
        filters: []
    },
    report1: {
        function: report1,
        name: 'Выполенные этапы',
        description: 'Без описания',
        ttl: 12 * 60 * 60, // 12 часов
        filters: ['dateRange']
    },
    report2: {
        function: report2,
        name: 'Номенклатура',
        description: 'Без описания',
        ttl: 12 * 60 * 60, // 12 часов
        filters: ['dateRange']
    },
    report3: {
        function: report3,
        name: 'ABC анализ по клиентам',
        description: 'Без описания',
        ttl: 12 * 60 * 60, // 12 часов
        filters: ['dateRange']
    },
    report4: {
        function: report4,
        name: 'Список давальческой закалки',
        description: 'Без описания',
        ttl: 12 * 60 * 60, // 12 часов
        filters: ['dateRange']
    },
}
broker.createService({
    name: "reports",
    actions: {
        create: {
            rest: "POST /create",
            permissions: ['Отчеты'],
            async handler(ctx) {
                const { filters, type } = ctx.params;
                const user = ctx.meta.user
                if (!map[type]) throw new MoleculerClientError(`Неизвестный тип отчёта: ${type}`, 422, 'UNKNOWN_REPORT_TYPE', { type });
                const { buffer, uuid, createdAt } = await map[type].function({ filters, ctx });
                const reports = JSON.parse(await valkey.get('reports') || '[]');
                await valkey.set('reports', JSON.stringify([...reports, { uuid, createdAt, type, user, filters }]));
                ctx.meta.$responseType =
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                ctx.meta.$responseHeaders = {
                    "Content-Disposition": `attachment; filename="report_${uuid}.xlsx"`,
                    "Content-Length": buffer.length
                };
                return buffer;
            }
        },
        list: {
            rest: "GET /list",
            permissions: ['Отчеты'],
            async handler(ctx) {
                const reports = JSON.parse(await valkey.get('reports') || '[]');
                return {
                    createdReports: reports,
                    reportsList: Object.entries(map).map(([key, value]) => ({ type: key, name: value.name, description: value.description, ttl: value.ttl, filters: value.filters, user: value.user }))
                }
            }
        },
        download: {
            rest: "GET /download",
            permissions: ['Отчеты'],
            async handler(ctx) {
                const { uuid } = ctx.params;
                const reports = JSON.parse(await valkey.get('reports') || '[]');
                const report = reports.find(r => r.uuid === uuid);
                if (!report) {
                    throw new MoleculerClientError('Отчёт не найден', 404, 'REPORT_NOT_FOUND', { uuid });
                }
                const filePath = path.join(__dirname, `./temporal/${report.uuid}.xlsx`);
                const file = await fs.readFile(filePath);
                ctx.meta.$responseType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                ctx.meta.$responseHeaders = {
                    'Content-Disposition': `attachment; filename="report_${report.uuid}.xlsx"`
                };
                return file;
            }
        }
    }
});

import expDemands from './1c/demands.js'
import expInvoiceout from './1c/invoiceout.js'
import expProd from './1c/production.js'
// Отдельный сервис (тот же процесс/broker) для интеграции с 1С.
broker.createService({
    name: "1c",
    actions: {
        production: {
            rest: "GET /production",
            // Заходит по ?token=ONE_C_TOKEN (см. gateway authenticate) —
            // тогда пользователь системный с ролью 'Админ', permissions не нужны.
            // Либо укажите permissions: ['Админ'] если хотите пускать только через токен/JWT-админа.
            permissions: ['Админ'],
            async handler(ctx) {
                const result = await expProd(ctx.params, ctx)
                return result
            }
        },
        demand: {
            rest: "GET /demand",
            permissions: ['Админ'],
            async handler(ctx) {
                const result = await expDemands(ctx.params, ctx)
                return result
            }
        },
        invoiceout: {
            rest: "GET /invoiceout",
            permissions: ['Админ'],
            async handler(ctx) {
                const result = await expInvoiceout(ctx.params, ctx)
                return result
            }
        },
    }
});

await broker.start();

const checkReports = async () => {
    const { createdReports, reportsList } = await broker.call("reports.list");
    const now = Date.now();
    const updatedReports = []
    for(const createdReport of createdReports) {
        if(now - createdReport.createdAt > reportsList.find(r => r.type === createdReport.type)?.ttl * 1000) {
            try{
                await fs.unlink(path.join(__dirname, `./temporal/${createdReport.uuid}.xlsx`));
                continue
            }catch(e){
                broker.logger.error({ err: e, uuid: createdReport.uuid }, `Ошибка удаления файла отчёта ${createdReport.uuid}.xlsx`);
            }
        }
        updatedReports.push(createdReport)
    }
    await valkey.set('reports', JSON.stringify(updatedReports));
}
setInterval(checkReports, 10 * 60 * 1000) // каждые 10 минут