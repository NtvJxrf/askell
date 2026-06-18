import { ServiceBroker } from "moleculer";
import got from 'got';
import https from 'https';
import { initEnv } from "@askell/shared";

const broker = new ServiceBroker({
  nodeID: "proxy",
  transporter: "nats://localhost:4222",
  logger: true
});

const WINDOW_MS = 3000;
const MAX_WINDOW_REQUESTS = 11;

const TOKEN_PARALLEL_LIMIT = 5;
const ACCOUNT_PARALLEL_LIMIT = 20;

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
        default:
            throw new Error(`Неизвестный токен: ${tokenName}`);
    }
}
function chooseToken(type) {
    if (['post', 'put', 'delete'].includes(type))
        return 'main'
    for(const token of get_tokens){
        if(state[token] < TOKEN_PARALLEL_LIMIT){
            return token
        }
    }
}
const get_tokens = [ 'token2', 'token3', 'token4'];
const state = {
    main: 0,
    token2: 0,
    token3: 0,
    token4: 0,
    last_3_sec_count: 0,
    totalParallel: 0,
}
function canRequest(){
    if(state.totalParallel >= ACCOUNT_PARALLEL_LIMIT) return false
    if(state.last_3_sec_count >= MAX_WINDOW_REQUESTS) return false
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
                state.last_3_sec_count++;
                setTimeout(() => {
                    state.last_3_sec_count--;
                }, WINDOW_MS);
                state.totalParallel++;
                try{
                    console.log(`Making ${type.toUpperCase()} request to ${url} with token ${token}. Current state:`, state);
                    const response = await gotClient[type](url, { ...args });
                    try{
                        const body = JSON.parse(response.body);
                        return body
                    }catch(err){
                        console.error(`Error parsing response from ${url}:`, err);
                        return response.body
                    }
                }
                catch(err){
                    console.error(`Error in request to ${url} with token ${token}:`, err);
                    throw err;
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
            const { url, type = 'get', data = null } = ctx.params;
            try{
                const response = await gotClient[type](url, { ...args });
                try{
                    const body = JSON.parse(response.body);
                    return body
                }catch(err){
                    console.error(`Error parsing response from ${url}:`, err);
                    return response.body
                }
            }catch(err){
                console.error(`Error in request to ${url} with token ${token}:`, err);
                throw err;
            }
        }
    }
});

broker.start();