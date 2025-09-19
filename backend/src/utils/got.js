import got from 'got';
import ApiError from './apiError.js';

const gotClient = got.extend({
    retry: {
        limit: 3,
        statusCodes: [408, 500, 502, 503, 504],
        errorCodes: ['ETIMEDOUT', 'ECONNREFUSED'],
    },
    timeout: {
        request: 600_000, // 10 минут
    },
    throwHttpErrors: false,
});

let globalRequestCount = 0;
const tokenStats = {
    main: { requestCount: 0, parallel: 0 },
    second: { requestCount: 0, parallel: 0 },
};

const GLOBAL_LIMIT = 40;
const TOKEN_LIMIT = 35;
const PARALLEL_LIMIT = 5;
const WINDOW = 3_000;

function getTokenEnv(tokenName) {
    switch (tokenName) {
        case 'main':
            return process.env.SkladAuthToken;
        case 'second':
            return process.env.SkladAuthToken2;
        default:
            throw new Error(`Неизвестный токен: ${tokenName}`);
    }
}

export default class Client {
    static async request(url, type = 'get', args) {
        const response = await gotClient[type](url, args);
        if (response.statusCode >= 200 && response.statusCode < 300)
            return JSON.parse(response.body);
        else
            throw new ApiError(
                response.statusCode,
                `Ошибка во время запроса к ${url}, ${response.body}`,
            );
    }

    static async sklad(url, type = 'get', data, token = 'main') {
        const tokenData = tokenStats[token];
        if (!tokenData)
            throw new Error(`Неизвестный токен: ${token}`);

        const args = {
            headers: {
                Authorization: `Bearer ${getTokenEnv(token)}`,
            },
            json: data || undefined,
        };
        while (
            globalRequestCount >= GLOBAL_LIMIT ||
            tokenData.requestCount >= TOKEN_LIMIT ||
            tokenData.parallel >= PARALLEL_LIMIT
        ) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        globalRequestCount++;
        tokenData.requestCount++;
        tokenData.parallel++;

        setTimeout(() => {
            globalRequestCount--;
            tokenData.requestCount--;
        }, WINDOW);

        try {
            console.log(globalRequestCount)
            return await this.request(url, type, args);
        } finally {
            tokenData.parallel--;
        }
    }
}
