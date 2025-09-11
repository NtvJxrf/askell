import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import { google } from "googleapis";
import { writeFile, readFile } from 'fs/promises';
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

function calcLoad(objects, startIndex, load, columns, toNum) {
    let result = 0;
    let index = startIndex;
    while (load > 0) {
        result++;
        for (const col of columns) {
            load -= toNum(objects[0][col]) * toNum(objects[index][col]);
        }
        index++;
    }
    return result;
}
async function readSheet() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "./schedule-471508-c646e9809860.json",
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "1PpE2ng3DS8u0aJCEzUrysIePp-ji731uF7z2wcb_XBQ";
    const range = "schedule!A1:Z500";

    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const objects = toObjects(res.data.values);
    const currentDate = todayISO();
    const currentLoad = await load();

    const index = objects.findIndex(el => el["Дата"] === currentDate);

    const toNum = str => Number(str.replace(",", "."));

    const curvedLoad = currentLoad["Криволинейка"].P + currentLoad.totalCutsv1 * 1.86 + totalCutsv2 * 3.5 + totalCutsv3 * 7;
    const straightLoad = currentLoad["Прямолинейка"].P;
    const triplexLoad = currentLoad.totalTriplexM2;

    const curvedResult = calcLoad(objects, index, curvedLoad, ["Интермак", "Альпа большая", "Альпа малая"], toNum);
    const straightResult = calcLoad(objects, index, straightLoad, ["Джими"], toNum);
    const triplexResult = calcLoad(objects, index, triplexLoad, ["Триплекс"], toNum);

    console.log(currentLoad);
    console.log(curvedResult);
    console.log(straightResult);
    console.log(triplexResult);
}
readSheet()