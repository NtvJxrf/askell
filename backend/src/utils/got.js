import got from 'got';
import ApiError from './apiError.js';

const gotClient = got.extend({
    retry: {
        limit: 3,
        statusCodes: [408, 500, 502, 503, 504],
        errorCodes: ['ETIMEDOUT', 'ECONNREFUSED'],
    },
    throwHttpErrors: false,
});
let moyskladRequestCount = 0;
let moyskladParralelRequestCount = 0
const MOYSKLAD_LIMIT = 40;


export default class Client {
    static async request(url, type, args, service) {
        moyskladParralelRequestCount++;
        try {
            const response = await gotClient[type](url, args);

            if (response.statusCode >= 200 && response.statusCode < 300) 
                return JSON.parse(response.body)
            else 
                throw new ApiError(response.statusCode, `Ошибка во время запроса к ${service}, ${response.body}`)
        } finally {
            moyskladParralelRequestCount--;
        }
    }


    static async sklad(url, type = 'get', data) {
        const args = {
            headers: {
                Authorization: `Bearer ${process.env.SkladAuthToken}`,
            },
            json: data || undefined,
        };
        while (moyskladRequestCount >= MOYSKLAD_LIMIT || moyskladParralelRequestCount > 3) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        moyskladRequestCount++
        setTimeout(() => {
            moyskladRequestCount--
        }, 3_000)
        return this.request(url, type, args, 'MoySklad');
    }
}
