// Порты метрик уникальны на процесс: каждый сервис поднимает /metrics,
// который скрейпит otel-collector SigNoz (см. observability/).
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
  ]
};
