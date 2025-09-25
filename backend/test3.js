import Client from './src/utils/got.js';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
dotenv.config();

// Функция для сбора всех данных

const res = await Client.request('http://localhost:7878/api/sklad/createPzHook?id=56508553-4474-11f0-0a80-1b74001fc4eb', 'post')