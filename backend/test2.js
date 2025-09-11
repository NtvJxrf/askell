import XLSX from "xlsx";
import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { google } from "googleapis";

const res = await Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/customentity/e4579b8f-8e43-11f0-0a80-0049002566f8')
const attrMap = {
    'Значение': 'value',
    'Норма в час': 'ratePerHour',
    'Сделка': 'costOfWork',
    'Оклад': 'salary',
    'Где выполняется': 'place'
}
const result = res.rows.reduce((acc, el) => {
    const attrs = el.attributes.reduce((obj, curr) => {
        const mappedKey = attrMap[curr.name];
        if (mappedKey) {
        obj[mappedKey] = curr.value;
        }
        return obj;
    }, {});

    acc[el.name] = attrs;
    return acc;
}, {});
console.log(result)