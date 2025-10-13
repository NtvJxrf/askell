import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
const res = await Client.request('http://localhost:7878/api/extension/logisticRequest', 'post', {
    json: {
        dataFromForm: {
            deliveryDays: 1,
            targetDate: '08.10.2025',
            id: '5f3e87dd-a44e-11f0-0a80-0ce70026913c',
            requestFrom: '1c@askell'
        },
        user: {
            login: '1c@askell',
        }
    }
})
console.log(res)