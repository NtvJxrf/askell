import { ServiceBroker } from "moleculer";
import { initEnv, valkey } from "@askell/shared";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import report1 from "./src/report1.js";
import report2 from "./src/report2.js";
import report3 from "./src/report3.js";
const broker = new ServiceBroker({
  nodeID: "reports",
  transporter: "nats://localhost:4222",
  logger: true
});
export const map = {
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
    }
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
                const { buffer, uuid, createdAt } = await map[type].function({ filters, broker });
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
                    throw new Error('Report not found');
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
                console.error(`Error deleting report file ${createdReport.uuid}.xlsx:`, e);
            }
        }
        updatedReports.push(createdReport)
    }
    await valkey.set('reports', JSON.stringify(updatedReports));
}
setInterval(checkReports, 10 * 60 * 1000) // каждые 10 минут