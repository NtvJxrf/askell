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
        return state.last_3_sec_count < MAX_WINDOW_REQUESTS ? 'main' : null;
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

broker.createService({
    name: "proxy",

    actions: {
        // Any authenticated user (no `roles` metadata required).
        sklad: {
            rest: "POST /sklad",
            async handler(ctx){
                const {url, type = 'get', data = null} = ctx.params;

                // if(process.env.NODE_ENV === 'development'){
                //     return await gotClient.get(`https://calc.askell.ru/api/proxy?devToken=${process.env.DEV_TOKEN}`, { url, type, data });
                // }
                while(!canRequest()) 
                    await new Promise(r => setTimeout(r, 50));
                let token = chooseToken(type);
                while (token == null) {
                    await new Promise(r => setTimeout(r, 50));
                    token = chooseToken(type);
                }
                if(token == 'main'){
                    while(state.main >= TOKEN_PARALLEL_LIMIT) 
                        await new Promise(r => setTimeout(r, 50));
                }

                const args = {
                    headers: {
                        Authorization: `Bearer ${getTokenEnv(token)}`,
                    }
                }
                if (data) args.json = data;
                
                state[token]++;
                if (token === 'extension') {
                    state.last_3_sec_count_extension++;
                    setTimeout(() => {
                        state.last_3_sec_count_extension--;
                    }, EXTENSION_WINDOW_MS);
                } else {
                    state.last_3_sec_count++;
                    setTimeout(() => {
                        state.last_3_sec_count--;
                    }, WINDOW_MS);
                }
                state.totalParallel++;
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
                    state[token]--;
                    state.totalParallel--;
                }
            }
        },
        fetchAllRows: {
            rest: "POST /fetchAllRows",
            async handler(ctx){
                const { url } = ctx.params;
                const limit = 100;
                const firstUrl = `${url}&limit=${limit}&offset=0`;
                const firstResponse = await ctx.call('proxy.sklad', { url: firstUrl });

                if (!firstResponse.rows || firstResponse.rows.length === 0) {
                    return [];
                }

                const allRows = [...firstResponse.rows];
                const totalSize = firstResponse.meta?.size || allRows.length;

                const requests = [];
                for (let offset = limit; offset < totalSize; offset += limit) {
                    const url_new = `${url}&limit=${limit}&offset=${offset}`;
                    requests.push(ctx.call('proxy.sklad', { url: url_new }));
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