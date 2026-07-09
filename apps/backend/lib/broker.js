// Единая фабрика ServiceBroker для всех сервисов бэкенда.
// Здесь централизованно настроены: транспорт, структурированные логи (Pino),
// трассировка (Zipkin-формат -> SigNoz) и метрики (Prometheus -> SigNoz).
//
// env:
//   NATS_URL          - адрес NATS (по умолчанию nats://localhost:4222)
//   LOG_LEVEL         - уровень логов (по умолчанию info)
//   OTEL_LOGS_ENABLED - 'false' чтобы не слать логи в SigNoz (в консоль пишутся всегда)
//   TRACING_ENABLED   - 'false' чтобы выключить трассировку
//   SIGNOZ_ZIPKIN_URL - endpoint приёма трейсов (по умолчанию http://localhost:9411)
//   METRICS_PORT      - порт /metrics для Prometheus-скрейпа (задаётся в ecosystem.config.cjs;
//                       если не задан - метрики выключены)
//   METRICS_HOST      - на каком адресе слушать /metrics. На dev не задавать (все
//                       интерфейсы — так требует Docker Desktop). На прод-Linux
//                       ставьте IP docker-моста (обычно 172.17.0.1), чтобы метрики
//                       не были доступны снаружи, но оставались доступны коллектору
import '@askell/shared/env';
import { ServiceBroker } from 'moleculer';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Middleware: структурированный лог каждой упавшей action с requestID/traceID,
 * чтобы ошибку можно было найти в SigNoz и связать с трейсом.
 * Параметры действий НЕ логируются (в них бывают пароли/токены).
 */
const actionErrorLogger = {
  name: 'ActionErrorLogger',
  localAction(next, action) {
    return async (ctx) => {
      const start = Date.now();
      try {
        return await next(ctx);
      } catch (err) {
        ctx.service?.logger?.error(
          {
            action: action.name,
            caller: ctx.caller || null,
            requestID: ctx.requestID,
            // Zipkin traceID = requestID без дефисов - удобно копировать в поиск трейсов SigNoz
            traceID: ctx.requestID ? ctx.requestID.replace(/-/g, '') : null,
            durationMs: Date.now() - start,
            err: {
              name: err.name,
              message: err.message,
              code: err.code,
              type: err.type,
              data: err.data,
              stack: err.stack,
            },
          },
          `Action ${action.name} failed: ${err.message}`
        );
        throw err;
      }
    };
  },
};

const buildLogger = (nodeID) => {
  const targets = [];
  if (process.env.OTEL_LOGS_ENABLED !== 'false') {
    targets.push({
      target: 'pino-opentelemetry-transport',
      options: {
        loggerName: nodeID,
        resourceAttributes: {
          'service.name': nodeID,
          'deployment.environment': process.env.NODE_ENV || 'production',
        },
      },
    });
  }
  targets.push(
    isDev
      ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' } }
      : { target: 'pino/file', options: { destination: 1 } } // stdout -> pm2 logs
  );
  return {
    type: 'Pino',
    options: {
      pino: {
        options: {
          level: process.env.LOG_LEVEL || 'info',
          base: { service: nodeID },
          transport: { targets },
        },
      },
    },
  };
};

export function createBroker(nodeID, overrides = {}) {
  const metricsPort = Number(process.env.METRICS_PORT || 0);

  return new ServiceBroker({
    nodeID,
    transporter: process.env.NATS_URL || 'nats://localhost:4222',
    logLevel: process.env.LOG_LEVEL || 'info',
    logger: buildLogger(nodeID),

    tracing: process.env.TRACING_ENABLED !== 'false'
      ? {
          enabled: true,
          // Собираем спаны всех action и событий; экспорт в SigNoz через Zipkin-совместимый приёмник.
          exporter: [
            {
              type: 'Zipkin',
              options: {
                baseURL: process.env.SIGNOZ_ZIPKIN_URL || 'http://localhost:9411',
                defaultTags: { 'deployment.environment': process.env.NODE_ENV || 'production' },
              },
            },
          ],
          events: true,
          stackTrace: true,
        }
      : false,

    metrics: metricsPort
      ? {
          enabled: true,
          reporter: [{
            type: 'Prometheus',
            options: {
              port: metricsPort,
              path: '/metrics',
              // На проде задайте METRICS_HOST=172.17.0.1 (docker-мост), чтобы /metrics
              // не слушал публичные интерфейсы.
              ...(process.env.METRICS_HOST ? { host: process.env.METRICS_HOST } : {}),
            },
          }],
        }
      : false,

    middlewares: [actionErrorLogger],

    ...overrides,
  });
}
