import Valkey from 'iovalkey'
export const valkey = new Valkey({
  host: process.env.VALKEY_HOST || 'localhost',
  port: process.env.VALKEY_PORT || 6379,
  db: 0,
});