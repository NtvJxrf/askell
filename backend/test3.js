import Client from './src/utils/got.js';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
dotenv.config();

// Функция для сбора всех данных

const res = await Client.request('http://localhost:7878/api/sklad/orderChanged', 'post', 
    {json: {
        auditContext: {
            meta: {
            type: 'audit',
            href: 'https://api.moysklad.ru/api/remap/1.2/audit/e9c64ea0-84c7-11f0-0a80-0028002075cd'
            },
            uid: '1c@askell',
            moment: '2025-08-29 14:04:20'
        },
        events: [
            {
            meta: {
                type: 'customerorder',
                href: 'https://api.moysklad.ru/api/remap/1.2/entity/customerorder/b7591dda-a82c-11f0-0a80-0fd9011d206a'
            },
            updatedFields: ['state'],
            action: 'UPDATE',
            accountId: '055e482b-6e69-11e4-7a07-673d00000b3a'
            }
        ]
        }}
)
