// Порты метрик уникальны на процесс: каждый сервис поднимает /metrics,
// который скрейпит otel-collector SigNoz (см. observability/).
//
// restart_delay/kill_timeout выставлены, чтобы избежать гонки при рестарте:
// без задержки pm2 успевает заново запустить процесс раньше, чем ОС освобождает
// METRICS_PORT предыдущего (транспортер NATS и pino-opentelemetry воркер ещё
// доживают доли секунды после падения) - получается самоподдерживающийся
// цикл падений с EADDRINUSE (именно это было с websocket/extension).
const commonAppOptions = {
  kill_timeout: 5000,
  restart_delay: 3000,
  exp_backoff_restart_delay: 200,
  min_uptime: '10s',
  max_restarts: 15,
};

module.exports = {
  apps: [
    { name: 'gateway', script: './apps/backend/gateway/index.js', env: { METRICS_PORT: 3031 } },
    { name: 'users', script: './apps/backend/users/index.js', env: { METRICS_PORT: 3032 } },
    { name: 'proxy', script: './apps/backend/proxy/index.js', env: { METRICS_PORT: 3033 } },
    { name: 'data-refresher', script: './apps/backend/data-refresher/index.js', env: { METRICS_PORT: 3034 } },
    { name: 'sklad', script: './apps/backend/sklad/index.js', env: { METRICS_PORT: 3035 } },
    { name: 'productionCompletion', script: './apps/backend/productionCompletion/index.js', env: { METRICS_PORT: 3036 } },
    { name: 'websocket', script: './apps/backend/ws/index.js', env: { METRICS_PORT: 3037 } },
    { name: 'reports', script: './apps/backend/reports/index.js', env: { METRICS_PORT: 3038 } },
    { name: 'extension', script: './apps/backend/extension/index.js', env: { METRICS_PORT: 3039 } },
  ].map((app) => ({ ...commonAppOptions, ...app })),
};
