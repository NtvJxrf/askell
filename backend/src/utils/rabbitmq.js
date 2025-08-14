import amqp from 'amqplib';

let connection;
let channel;

export async function initQueue() {
    connection = await amqp.connect('amqp://admin:%5EjZG1L%2Fi@localhost');
    channel = await connection.createChannel();

    const queues = ['pzwebhook', 'changeStatusByDemand'];
    for (const q of queues) {
        await channel.assertQueue(q, { durable: true });
    }

    console.log('RabbitMQ connected, queues ready');
    return channel;
}

export function getQueueChannel() {
    if (!channel) throw new Error('Queue channel is not initialized');
    return channel;
}