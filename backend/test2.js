import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
const res = await Client.request('http://localhost:7878/api/extension/logisticRequest', 'post', {
    json: {
        dataFromForm: {
            deliveryDays: 1,
            targetDate: '08.10.2025',
            id: '56508553-4474-11f0-0a80-1b74001fc4eb',
            requestFrom: '1c@askell'
        },
        user: {
            login: '1c@askell',
        }
    }
})
console.log(res)