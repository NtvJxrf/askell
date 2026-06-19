import { google } from "googleapis"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyFilePath = path.resolve(__dirname, '../../../../schedule-471508-c646e9809860.json');
import { valkey } from "@askell/shared";

export async function updateSchedule() {
    const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "1PpE2ng3DS8u0aJCEzUrysIePp-ji731uF7z2wcb_XBQ";
    const range = "schedule!A1:Z500";

    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    function toObjects(values) {
        const [header, ...rows] = values;
        return rows.map(row =>
            Object.fromEntries(header.map((key, i) => [key, row[i] ?? null]))
        );
    }
    function todayISO() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}.${m}.${d}`;
    }
    const schedule = toObjects(res.data.values);
    const currentDate = todayISO();
    const index = schedule.findIndex(el => el["Дата"] === currentDate);
    await valkey.set('schedule', JSON.stringify({ schedule, index }));
    return {
        schedule,
        index
    }
}