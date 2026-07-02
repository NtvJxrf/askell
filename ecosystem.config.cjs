module.exports = {
  apps: [
    { name: 'gateway', script: './apps/backend/gateway/index.js' },
    { name: 'users', script: './apps/backend/users/index.js' },
    { name: 'proxy', script: './apps/backend/proxy/index.js' },
    { name: 'data-refresher', script: './apps/backend/data-refresher/index.js' },
    { name: 'sklad', script: './apps/backend/sklad/index.js' },
    { name: 'productionCompletion', script: './apps/backend/productionCompletion/index.js' },
    { name: 'websocket', script: './apps/backend/ws/index.js' },
    { name: 'reports', script: './apps/backend/reports/index.js' },
    { name: 'extension', script: './apps/backend/extension/index.js' },
  ]
};
