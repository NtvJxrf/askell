import WebSocket, { WebSocketServer } from 'ws';
import logger from './logger.js'
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  logger.info('new ws connection');

  ws.on('close', () => {
    logger.info('ws connection close');
  });
});

export function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}
export default wss