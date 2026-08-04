import { Errors } from "moleculer";
import got from 'got';
import https from 'https';
import { createBroker } from "../lib/broker.js";

const { MoleculerError } = Errors;

const broker = createBroker("proxy");

const WINDOW_MS = 3000;
const ACCOUNT_PARALLEL_LIMIT = 20;
const TOKEN_PARALLEL_LIMIT = 5;

// Окно частоты общее для группы токенов:
//  - main + token2..4 делят один лимит на всех (11 запросов за 3 с);
//  - extension - отдельный токен с собственным лимитом (42 за 3 с).
// Параллелизм считается на каждый токен (TOKEN_PARALLEL_LIMIT)
// и суммарно на аккаунт (ACCOUNT_PARALLEL_LIMIT).
const GROUPS = {
    shared:    { rate: 11 },
    extension: { rate: 42 },
};
const TOKENS = {
    main:      { env: 'SkladAuthToken',          group: 'shared' },
    token2:    { env: 'SkladAuthToken2',         group: 'shared' },
    token3:    { env: 'SkladAuthToken3',         group: 'shared' },
    token4:    { env: 'SkladAuthToken4',         group: 'shared' },
    extension: { env: 'SkladAuthTokenExtension', group: 'extension' },
};
// Запись идёт только через main, чтение - через extension (самый большой лимит) и запасные токены.
const WRITE_TOKENS = ['main'];
const READ_TOKENS = ['extension', 'token2', 'token3', 'token4'];

const MAX_ATTEMPTS = 3;
// Сетевым ошибкам даём больше попыток: они лечатся повтором по новому соединению.
const MAX_NETWORK_ATTEMPTS = 5;
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);
const RETRYABLE_ERROR_CODES = new Set([
    'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN', 'ERR_STREAM_PREMATURE_CLOSE',
    'ECONNABORTED', 'EHOSTUNREACH', 'ENETUNREACH', 'ENETRESET', 'EPROTO', 'ERR_SOCKET_CONNECTION_TIMEOUT',
]);

const HEAVY_ENDPOINTS = [
    'api/remap/1.2/report/stock/all',
];
function getRequestWeight(url) {
    return HEAVY_ENDPOINTS.some(pattern => url?.includes(pattern)) ? 2 : 1;
}
// Отчёты МойСклад считаются минутами - им нужны отдельные, более щедрые таймауты.
const isReportUrl = (url) => Boolean(url?.includes('/report/'));

// timeout у агента закрывает ПРОСТАИВАЮЩИЕ сокеты в пуле (активные запросы Node не трогает).
// Мёртвое keep-alive соединение (тихо закрытое МС, балансировщиком или NAT) остаётся в пуле,
// следующий запрос уходит в никуда и падает с "read ETIMEDOUT" - поэтому окно простоя держим
// заведомо короче любого серверного/NAT keep-alive таймаута.
const IDLE_SOCKET_MS = 10_000;
const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 5_000,
    timeout: IDLE_SOCKET_MS,
    maxSockets: 30,
    maxFreeSockets: 8,
    scheduling: 'lifo',
});
// Запись повторить нельзя (будут дубли документов), поэтому POST/PUT/DELETE идут по свежему
// соединению: сокет из пула может оказаться уже мёртвым, а восстановиться после этого нечем.
const writeAgent = new https.Agent({ keepAlive: false, maxSockets: ACCOUNT_PARALLEL_LIMIT });
const agentFor = (type) => ({ https: IDEMPOTENT_METHODS.has(type) ? httpsAgent : writeAgent });

// Соединение умерло на сетевом уровне - обычно вместе с ним протухли и соседние сокеты в пуле
// (тот же NAT/балансировщик). Выкидываем простаивающие, чтобы повтор пошёл по новому коннекту.
function dropIdleSockets() {
    for (const sockets of Object.values(httpsAgent.freeSockets)) {
        for (const socket of [...sockets]) socket.destroy();
    }
}

const DEFAULT_TIMEOUTS = {
    lookup: 5_000,
    connect: 10_000,
    secureConnect: 10_000,
    socket: 90_000,
    response: 120_000,
    request: 180_000,
};
const REPORT_TIMEOUTS = {
    lookup: 5_000,
    connect: 10_000,
    secureConnect: 10_000,
    socket: 300_000,
    response: 600_000,
    request: 600_000,
};

const gotClient = got.extend({
    agent: { https: httpsAgent },
    // Повторы делает сам прокси (см. executeWithLimits): только так они проходят
    // через лимитер. Встроенный retry got шёл мимо счётчиков и сам провоцировал 429.
    retry: { limit: 0 },
    timeout: DEFAULT_TIMEOUTS,
    throwHttpErrors: false,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const backoffMs = (attempt) => Math.min(500 * 2 ** (attempt - 1), 5_000) + Math.floor(Math.random() * 250);

function getTokenEnv(tokenName) {
    const config = TOKENS[tokenName];
    if (!config) throw new MoleculerError(`Неизвестный токен: ${tokenName}`, 500, 'UNKNOWN_TOKEN', { tokenName });
    return process.env[config.env];
}

// Параллелизм считается на токен, окно частоты - на группу токенов.
const tokenParallel = Object.fromEntries(Object.keys(TOKENS).map(name => [name, 0]));
// window - метки времени выданных запросов с весами, pausedUntil - пауза после 429.
const groupState = Object.fromEntries(Object.keys(GROUPS).map(name => [name, {
    window: [],
    windowWeight: 0,
    pausedUntil: 0,
}]));
let totalParallel = 0;

const groupOf = (token) => groupState[TOKENS[token].group];

function snapshot() {
    const out = { totalParallel };
    for (const [name, parallel] of Object.entries(tokenParallel)) out[name] = parallel;
    for (const [name, g] of Object.entries(groupState)) out[`${name}Window`] = g.windowWeight;
    return out;
}

// Скользящее окно вместо "отпустить всё через 3 с": иначе счётчик обнуляется пачкой
// и на стыке окон в реальные 3 секунды сервера улетает до двух лимитов сразу.
function pruneWindow(g, now) {
    while (g.window.length && now - g.window[0].t >= WINDOW_MS) {
        g.windowWeight -= g.window.shift().w;
    }
}

function canRequest(){
    return totalParallel < ACCOUNT_PARALLEL_LIMIT;
}

function chooseToken(candidates, weight, now) {
    for (const name of candidates) {
        if (tokenParallel[name] >= TOKEN_PARALLEL_LIMIT) continue;
        const g = groupOf(name);
        if (g.pausedUntil > now) continue;
        pruneWindow(g, now);
        if (g.windowWeight + weight > GROUPS[TOKENS[name].group].rate) continue;
        return name;
    }
    return null;
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

function assignToken(token, weight = 1) {
    const g = groupOf(token);
    tokenParallel[token]++;
    totalParallel++;
    g.window.push({ t: Date.now(), w: weight });
    g.windowWeight += weight;
}

// Токены освобождаются не только по завершению запроса, но и по времени
// (выпадение из окна) / по истечению паузы после 429 - на эти моменты ставим будильник.
let wakeTimer = null;
function scheduleWake() {
    const pending = queues.write.priority.length + queues.write.normal.length
        + queues.read.priority.length + queues.read.normal.length;
    if (pending === 0) return;
    const now = Date.now();
    let next = Infinity;
    for (const g of Object.values(groupState)) {
        pruneWindow(g, now);
        if (g.window.length) next = Math.min(next, g.window[0].t + WINDOW_MS);
        if (g.pausedUntil > now) next = Math.min(next, g.pausedUntil);
    }
    // Ничего не освободится по таймеру - разбудит releaseToken.
    if (!Number.isFinite(next)) return;
    if (wakeTimer) clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
        wakeTimer = null;
        processQueue();
    }, Math.max(1, next - now));
}

function processQueue() {
    let progressed = true;
    while (progressed) {
        progressed = false;
        for (const cat of ['write', 'read']) {
            if (!canRequest()) { scheduleWake(); return; }
            const lanes = queues[cat];
            const q = lanes.priority.length > 0 ? lanes.priority : lanes.normal;
            if (q.length === 0) continue;
            const token = chooseToken(cat === 'write' ? WRITE_TOKENS : READ_TOKENS, q[0].weight, Date.now());
            if (!token) continue;
            const item = q.shift();
            assignToken(token, item.weight);
            item.resolve(token);
            progressed = true;
        }
    }
    scheduleWake();
}

function acquireToken(type, priority = false, weight = 1) {
    return new Promise(resolve => {
        const item = { type, weight, resolve };
        queues[category(type)][priority ? 'priority' : 'normal'].push(item);
        processQueue();
    });
}

function releaseToken(token) {
    tokenParallel[token]--;
    totalParallel--;
    processQueue();
}

// МойСклад отдал 429 - тормозим всю группу токенов до указанного им момента,
// иначе следующая же попытка снова упрётся в тот же лимит.
function pauseToken(token, ms) {
    const g = groupOf(token);
    g.pausedUntil = Math.max(g.pausedUntil, Date.now() + ms);
    scheduleWake();
}

function retryAfterMs(headers = {}) {
    const lognex = Number(headers['x-lognex-retry-after']);
    if (Number.isFinite(lognex) && lognex > 0) return Math.min(lognex, 60_000);
    const standard = Number(headers['retry-after']);
    if (Number.isFinite(standard) && standard > 0) return Math.min(standard * 1000, 60_000);
    return WINDOW_MS;
}

function isRetryableError(err, type) {
    const code = err?.code;
    if (!code) return false;
    // Соединение не установилось - запрос точно не дошёл до МС, повтор безопасен для любого метода.
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN'
        || err.syscall === 'connect' || ['lookup', 'connect', 'secureConnect'].includes(err.event)) {
        return true;
    }
    // Дальше запрос мог быть обработан на стороне МС, поэтому POST/PUT/DELETE не повторяем:
    // иначе получим дубли документов (например, два производственных задания).
    return IDEMPOTENT_METHODS.has(type) && RETRYABLE_ERROR_CODES.has(code);
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
                return this.executeWithLimits({ url, type, data, priority, weight: getRequestWeight(url) });
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
            args.agent = agentFor(type);
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
    },

    methods: {
        // Один "логический" запрос к МойСклад: каждая попытка заново занимает слот
        // токена, поэтому повторы тоже учитываются лимитером.
        async executeWithLimits({ url, type, data, priority, weight }) {
            for (let attempt = 1; ; attempt++) {
                const token = await acquireToken(type, priority, weight);
                let response;
                try {
                    const options = { headers: { Authorization: `Bearer ${getTokenEnv(token)}` }, agent: agentFor(type) };
                    if (data) options.json = data;
                    if (isReportUrl(url)) options.timeout = REPORT_TIMEOUTS;

                    this.logger.debug({ type: type.toUpperCase(), url, token, attempt, state: snapshot() }, `MoySklad ${type.toUpperCase()} ${url}`);
                    console.log(`MoySklad ${type.toUpperCase()} ${url} (token: ${token}, attempt: ${attempt})`);
                    response = await gotClient[type](url, options);
                } catch (err) {
                    const retryable = isRetryableError(err, type);
                    // Пул мог протухнуть целиком - чистим его до повтора, иначе повтор возьмёт такой же мёртвый сокет.
                    if (retryable) dropIdleSockets();
                    if (attempt < MAX_NETWORK_ATTEMPTS && retryable) {
                        this.logger.warn({ url, token, attempt, code: err.code, message: err.message }, `Сетевая ошибка при запросе к ${url}, повтор`);
                        await sleep(backoffMs(attempt));
                        continue;
                    }
                    this.logger.error({ err, url, token, attempt }, `Ошибка запроса к ${url}`);
                    if (err instanceof MoleculerError) throw err;
                    throw new MoleculerError(`Ошибка при запросе к ${url}: ${err.message}`, 502, 'UPSTREAM_ERROR', { url, code: err.code });
                } finally {
                    releaseToken(token);
                }

                if (response.statusCode === 429) {
                    const waitMs = retryAfterMs(response.headers);
                    pauseToken(token, waitMs);
                    if (attempt < MAX_ATTEMPTS) {
                        this.logger.warn({ url, token, attempt, waitMs, state: snapshot() }, `МойСклад вернул 429, ждём ${waitMs} мс и повторяем`);
                        await sleep(waitMs);
                        continue;
                    }
                    throw new MoleculerError(`Превышены лимиты МойСклад при запросе к ${url}`, 429, 'RATE_LIMITED', { url });
                }

                if (response.statusCode >= 500 && attempt < MAX_ATTEMPTS && IDEMPOTENT_METHODS.has(type)) {
                    this.logger.warn({ url, token, attempt, statusCode: response.statusCode }, `МойСклад вернул ${response.statusCode}, повтор`);
                    await sleep(backoffMs(attempt));
                    continue;
                }

                if (response.statusCode >= 400) {
                    throw new MoleculerError(`Ошибка при запросе к ${url}: ${response.statusCode}`, 502, 'UPSTREAM_ERROR', { url, statusCode: response.statusCode, body: String(response.body).slice(0, 2000) });
                }

                try {
                    return JSON.parse(response.body);
                } catch (err) {
                    this.logger.warn({ url }, `Ответ от ${url} не JSON, возвращаем как есть`);
                    return response.body;
                }
            }
        }
    }
});

broker.start();