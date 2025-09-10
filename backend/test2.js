import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  keyFile: "./schedule-471508-c646e9809860.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

const spreadsheetId = "1bTquFu1q_XTsGeLf2ie3c82YtoKAknrMr2ok49BRTLk";
const range = "Цены и коэффициенты!A1:H500";

const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
const values = res.data.values;

const [header, , ...rows] = values; 

const result = {};
for (const row of rows) {
    const obj = Object.fromEntries(header.map((key, i) => [key, row[i] ?? null]));
    if (!obj.name) continue;
    if (obj.type === 'Работа') {
        result[obj.name] = {
        ratePerHour: obj.ratePerHour,
        costOfWork: obj.costOfWork,
        salary: obj.salary,
        place: obj.place
        };
    } else {
        result[obj.name] = { value: obj.value };
    }
}

console.log(result);