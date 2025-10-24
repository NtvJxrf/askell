import Client from './src/utils/got.js';
import dotenv from 'dotenv';
dotenv.config();
const res = await Client.request('http://localhost:7878/api/extension/logisticRequest', 'post', {
    json: {
        dataFromForm: {
            id: '56508553-4474-11f0-0a80-1b74001fc4eb',
            requestFrom: '1c@askell',
            positions: '1,3,5'
        },
        user: {
            login: '1c@askell',
        }
    }
})
console.log(res)