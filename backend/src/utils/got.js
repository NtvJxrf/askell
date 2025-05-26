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
const MOYSKLAD_LIMIT = 45;


class Client {
    static async request(url, type, args, service) {
        const response = await gotClient[type](url, args);
        if (response.statusCode >= 200 && response.statusCode < 300) {
            return JSON.parse(response.body);
        } else {
            throw new ApiError(response.statusCode, `Ошибка во время запроса к ${service}, ${response.body}`);
        }
    }

    static async sklad(url, type = 'get', data) {
        console.log(process.env.SkladAuthToken)
        const args = {
            headers: {
                Authorization: `Bearer ${process.env.SkladAuthToken}`,
            },
            json: data || undefined,
        };
        while (moyskladRequestCount >= MOYSKLAD_LIMIT) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        moyskladRequestCount++
        setTimeout(() => {
            moyskladRequestCount--
        }, 3_000)
        return this.request(url, type, args, 'MoySklad');
    }
}

export default Client;
