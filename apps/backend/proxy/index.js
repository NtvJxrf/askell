import { Errors } from "moleculer";
import got from 'got';
import https from 'https';
import { createBroker } from "../lib/broker.js";

const { MoleculerError } = Errors;

const broker = createBroker("proxy");

const WINDOW_MS = 3000;
const MAX_WINDOW_REQUESTS = 11;

const TOKEN_PARALLEL_LIMIT = 5;
const ACCOUNT_PARALLEL_LIMIT = 20;

// Отдельный токен с собственными лимитами (используется только для GET)
const EXTENSION_WINDOW_MS = 3000;
const EXTENSION_MAX_WINDOW_REQUESTS = 45;
const EXTENSION_TOKEN_PARALLEL_LIMIT = 5;

class KeepAliveAgent extends https.Agent {
    createConnection(options, cb) {
        const socket = super.createConnection(options, cb);
        socket.setKeepAlive(true, 15_000);
        return socket;
    }
}
const gotClient = got.extend({
    agent: { https: new KeepAliveAgent() },
    retry: {
        limit: 3,
        statusCodes: [408, 500, 502, 503, 504],
        errorCodes: ['ETIMEDOUT', 'ECONNREFUSED'],
    },
    timeout: {
        request: 600_000,
    },
    throwHttpErrors: false,
});

function getTokenEnv(tokenName) {
    switch (tokenName) {
        case 'main':
            return process.env.SkladAuthToken;
        case 'token2':
            return process.env.SkladAuthToken2;
        case 'token3':
            return process.env.SkladAuthToken3;
        case 'token4':
            return process.env.SkladAuthToken4;
        case 'extension':
            return process.env.SkladAuthTokenExtension;
        default:
            throw new MoleculerError(`Неизвестный токен: ${tokenName}`, 500, 'UNKNOWN_TOKEN', { tokenName });
    }
}
function chooseToken(type) {
    if (['post', 'put', 'delete'].includes(type))
        return (state.main < TOKEN_PARALLEL_LIMIT && state.last_3_sec_count < MAX_WINDOW_REQUESTS) ? 'main' : null;
    // Для GET в приоритете отдельный токен с расширенными лимитами
    if (state.extension < EXTENSION_TOKEN_PARALLEL_LIMIT && state.last_3_sec_count_extension < EXTENSION_MAX_WINDOW_REQUESTS) {
        return 'extension';
    }
    if (state.last_3_sec_count < MAX_WINDOW_REQUESTS) {
        for (const token of get_tokens) {
            if (state[token] < TOKEN_PARALLEL_LIMIT) {
                return token
            }
        }
    }
    return null;
}
const get_tokens = [ 'token2', 'token3', 'token4'];
const state = {
    main: 0,
    token2: 0,
    token3: 0,
    token4: 0,
    extension: 0,
    last_3_sec_count: 0,
    last_3_sec_count_extension: 0,
    totalParallel: 0,
}
function canRequest(){
    if(state.totalParallel >= ACCOUNT_PARALLEL_LIMIT) return false
    return true
}

// Очереди запросов на получение токена, разбитые по двум осям:
//  - категория ресурса (write -> токен 'main', read -> extension/token2-4),
//    т.к. это независимые пулы токенов и подходящий токен для головы очереди
//    не зависит от конкретного type внутри категории;
//  - приоритет (priority/normal), приоритетная очередь всегда разбирается первой.
// Благодаря этому диспетчеризация не требует сканирования всей очереди (O(1)
// проверка головы каждой из 4 очередей), что важно при 1-2 тыс. запросов в очереди.
function category(type) {
    return ['post', 'put', 'delete'].includes(type) ? 'write' : 'read';
}
const queues = {
    write: { priority: [], normal: [] },
    read: { priority: [], normal: [] },
};

function assignToken(token) {
    state[token]++;
    state.totalParallel++;
    if (token === 'extension') {
        state.last_3_sec_count_extension++;
        setTimeout(() => {
            state.last_3_sec_count_extension--;
            processQueue();
        }, EXTENSION_WINDOW_MS);
    } else {
        state.last_3_sec_count++;
        setTimeout(() => {
            state.last_3_sec_count--;
            processQueue();
        }, WINDOW_MS);
    }
}

function processQueue() {
    let progressed = true;
    while (progressed) {
        progressed = false;
        for (const cat of ['write', 'read']) {
            if (!canRequest()) return;
            const lanes = queues[cat];
            const q = lanes.priority.length > 0 ? lanes.priority : lanes.normal;
            if (q.length === 0) continue;
            const token = chooseToken(q[0].type);
            if (!token) continue;
            const item = q.shift();
            assignToken(token);
            item.resolve(token);
            progressed = true;
        }
    }
}

function acquireToken(type, priority = false) {
    return new Promise(resolve => {
        const item = { type, resolve };
        queues[category(type)][priority ? 'priority' : 'normal'].push(item);
        processQueue();
    });
}

function releaseToken(token) {
    state[token]--;
    state.totalParallel--;
    processQueue();
}

broker.createService({
    name: "proxy",

    actions: {
        sklad: {
            rest: "POST /sklad",
            permissions: ['Админ'],
            async handler(ctx){
                const {url, type = 'get', data = null, priority = false} = ctx.params;

                if(process.env.NODE_ENV === 'development'){
                    const { body } = await gotClient.post(`https://calc.askell.ru/api/backend/proxy/sklad?devToken=${process.env.DEV_TOKEN}`, { 
                        json: { url, type, data, priority },
                        responseType: 'json'
                    });
                    if(body?.name === 'MoleculerError'){
                        throw new MoleculerError(
                            body.message,
                            body.code,
                            body.type,
                            body.data
                        );
                    }
                    return body
                }
                const token = await acquireToken(type, priority);

                const args = {
                    headers: {
                        Authorization: `Bearer ${getTokenEnv(token)}`,
                    }
                }
                if (data) args.json = data;

                try{
                    this.logger.debug({ type: type.toUpperCase(), url, token, state: { ...state } }, `MoySklad ${type.toUpperCase()} ${url}`);
                    console.log(`MoySklad ${type.toUpperCase()} ${url} (token: ${token})`, state);
                    const response = await gotClient[type](url, { ...args });
                    if(response.statusCode >= 400){
                        throw new MoleculerError(`Ошибка при запросе к ${url}: ${response.statusCode}`, 502, 'UPSTREAM_ERROR', { url, statusCode: response.statusCode, body: String(response.body).slice(0, 2000) });
                    }
                    try{
                        const body = JSON.parse(response.body);
                        return body
                    }catch(err){
                        this.logger.warn({ url }, `Ответ от ${url} не JSON, возвращаем как есть`);
                        return response.body
                    }
                }
                catch(err){
                    console.error(err)
                    this.logger.error({ err, url, token }, `Ошибка запроса к ${url}`);
                    if (err instanceof MoleculerError) throw err;
                    throw new MoleculerError(`Ошибка при запросе к ${url}: ${err.message}`, 502, 'UPSTREAM_ERROR', { url });
                }
                finally{
                    releaseToken(token);
                }
            }
        },
        fetchAllRows: {
            rest: "POST /fetchAllRows",
            permissions: ['Админ'],
            async handler(ctx){
                const { url, priority = false } = ctx.params;
                if(process.env.NODE_ENV === 'development'){
                    const { body } = await gotClient.post(`https://calc.askell.ru/api/backend/proxy/fetchAllRows?devToken=${process.env.DEV_TOKEN}`, { 
                        json: {url, priority },
                        responseType: 'json'
                    });
                    return body;
                }
                const limit = 100;
                const firstUrl = `${url}&limit=${limit}&offset=0`;
                const firstResponse = await ctx.call('proxy.sklad', { url: firstUrl, priority });

                if (!firstResponse.rows || firstResponse.rows.length === 0) {
                    return [];
                }

                const allRows = [...firstResponse.rows];
                const totalSize = firstResponse.meta?.size || allRows.length;

                const requests = [];
                for (let offset = limit; offset < totalSize; offset += limit) {
                    const url_new = `${url}&limit=${limit}&offset=${offset}`;
                    requests.push(ctx.call('proxy.sklad', { url: url_new, priority }));
                }

                const responses = await Promise.all(requests);
                for (const res of responses) {
                    if (res.rows) {
                    allRows.push(...res.rows);
                    }
                }

                return allRows;
            }
        },
        async request(ctx){
            const { url, type = 'get', data = null, headers = {} } = ctx.params;
            const args = {};
            if (data) args.json = data;
            if (headers) args.headers = headers;
            try{
                this.logger.debug({ type: type.toUpperCase(), url }, `HTTP ${type.toUpperCase()} ${url}`);
                const response = await gotClient[type](url, args);
                try{
                    const body = JSON.parse(response.body);
                    return body
                }catch(err){
                    this.logger.warn({ url }, `Ответ от ${url} не JSON, возвращаем как есть`);
                    return response.body
                }
            }catch(err){
                this.logger.error({ err, url }, `Ошибка запроса к ${url}`);
                if (err instanceof MoleculerError) throw err;
                throw new MoleculerError(`Ошибка при запросе к ${url}: ${err.message}`, 502, 'UPSTREAM_ERROR', { url });
            }
        }
    }
});

broker.start();