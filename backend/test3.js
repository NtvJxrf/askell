import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
import { google } from "googleapis";
import { writeFile, readFile } from 'fs/promises';

// const res = await axios.post('http://localhost:7878/api/sklad/createPzHook?id=56508553-4474-11f0-0a80-1b74001fc4eb')
const res = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/webhook`, 'post', 
    {
        "url": "https://calc.askell.ru/api/sklad/orderChanged",
        "action": "UPDATE",
        "entityType": "customerorder",
        "diffType": "FIELDS"
    
})
console.log(res)