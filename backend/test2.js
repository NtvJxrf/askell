import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
const res = await Client.request('http://localhost:7878/api/extension/logisticRequest', 'post', {
    json: {
        id: '56508553-4474-11f0-0a80-1b74001fc4eb',
        deliveryDays: 1,
        positions: '',
        requestFrom: '62d9a852-3488-11f0-0a80-043b00408594',
        availableHours: '9-18',
        lunchBreak: '',
        targetDate: '13.10.2025',
    }
})
console.log(res)