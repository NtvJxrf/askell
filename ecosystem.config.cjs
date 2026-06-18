module.exports = {
  apps: [
    { name: 'gateway', script: './apps/backend/gateway/index.js' },
    { name: 'users', script: './apps/backend/users/index.js' },
    { name: 'proxy', script: './apps/backend/proxy/index.js' },
    { name: 'data-refresher', script: './apps/backend/data-refresher/index.js' },
  ]
};
