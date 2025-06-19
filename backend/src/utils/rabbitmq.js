import amqp from 'amqplib';

let channel;

export async function initQueue() {
  const conn = await amqp.connect('amqp://admin:%5EjZG1L%2Fi@localhost');
  channel = await conn.createChannel();
  await channel.assertQueue('pzwebhook', { durable: true });
  console.log('RabbitMQ connected');
  return channel;
}

export function getQueueChannel() {
  if (!channel) throw new Error('Queue channel is not initialized');
  return channel;
}
