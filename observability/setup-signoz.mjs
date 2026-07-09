// Установка/настройка self-hosted SigNoz для проекта.
//
//   pnpm signoz:setup  - клонирует SigNoz (v0.129.0) в ./signoz и патчит конфиги
//   pnpm signoz:up     - поднимает стек (docker compose)
//   pnpm signoz:down   - останавливает стек
//
// Патчи (идемпотентные):
//   1. UI SigNoz: 8080 -> 127.0.0.1:3301 (8080 занят нашим websocket-сервисом)
//   2. otel-collector: публикуем 9411 (zipkin) + extra_hosts для Linux
//   3. ВСЕ порты стека привязаны к 127.0.0.1 — наружу ничего не торчит.
//      Бэкенд ходит в коллектор через localhost; UI на проде — через
//      SSH-туннель (ssh -L 3301:localhost:3301 user@server) или nginx с auth.
//   4. otel-collector-config: zipkin receiver, prometheus-скрейп наших
//      сервисов (METRICS_PORT 3031-3039 из ecosystem.config.cjs),
//      zipkin в pipeline traces
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const signozDir = path.join(root, 'signoz');
const composeFile = path.join(signozDir, 'deploy', 'docker', 'docker-compose.yaml');
const collectorConfigFile = path.join(signozDir, 'deploy', 'docker', 'otel-collector-config.yaml');

const SIGNOZ_TAG = 'v0.129.0';

const BACKEND_METRIC_TARGETS = [
  'host.docker.internal:3031', // gateway
  'host.docker.internal:3032', // users
  'host.docker.internal:3033', // proxy
  'host.docker.internal:3034', // data-refresher
  'host.docker.internal:3035', // sklad
  'host.docker.internal:3036', // productionCompletion
  'host.docker.internal:3037', // websocket
  'host.docker.internal:3038', // reports
  'host.docker.internal:3039', // extension
];

// ---------------------------------------------------------------- helpers
const log = (msg) => console.log(`[signoz-setup] ${msg}`);

function patchFile(file, patches) {
  // git на Windows может выдать CRLF — нормализуем, чтобы многострочные патчи работали
  let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const { name, marker, find, replace } of patches) {
    if (content.includes(marker)) {
      log(`SKIP  ${name} (уже применён)`);
      continue;
    }
    const next = content.replace(find, replace);
    if (next === content) {
      throw new Error(`Патч "${name}" не применился к ${file} — структура файла изменилась, проверьте вручную.`);
    }
    content = next;
    log(`OK    ${name}`);
  }
  fs.writeFileSync(file, content);
}

// ---------------------------------------------------------------- clone
if (!fs.existsSync(signozDir)) {
  log(`Клонирую SigNoz ${SIGNOZ_TAG} в ./signoz ...`);
  execSync(`git clone --depth 1 --branch ${SIGNOZ_TAG} https://github.com/SigNoz/signoz.git signoz`, {
    cwd: root,
    stdio: 'inherit',
  });
} else {
  log('./signoz уже существует — пропускаю клонирование');
}

// ---------------------------------------------------------------- compose
patchFile(composeFile, [
  {
    name: 'otel-collector: публикация zipkin 9411',
    marker: 'Zipkin receiver (Moleculer tracing)',
    find: /- "4318:4318" # OTLP HTTP receiver/,
    replace: '- "4318:4318" # OTLP HTTP receiver\n      - "9411:9411" # Zipkin receiver (Moleculer tracing)',
  },
  {
    name: 'UI порт -> 127.0.0.1:3301 (8080 занят нашим ws, наружу не торчим)',
    marker: '127.0.0.1:3301:8080',
    find: /- "(?:8080|3301):8080"/,
    replace: '- "127.0.0.1:3301:8080"',
  },
  {
    name: 'OTLP gRPC 4317 -> только localhost',
    marker: '127.0.0.1:4317:4317',
    find: '- "4317:4317"',
    replace: '- "127.0.0.1:4317:4317"',
  },
  {
    name: 'OTLP HTTP 4318 -> только localhost',
    marker: '127.0.0.1:4318:4318',
    find: '- "4318:4318"',
    replace: '- "127.0.0.1:4318:4318"',
  },
  {
    name: 'Zipkin 9411 -> только localhost',
    marker: '127.0.0.1:9411:9411',
    find: '- "9411:9411"',
    replace: '- "127.0.0.1:9411:9411"',
  },
  {
    name: 'otel-collector: host.docker.internal на Linux',
    marker: 'host.docker.internal:host-gateway',
    find: '    container_name: signoz-otel-collector',
    replace: '    container_name: signoz-otel-collector\n    extra_hosts:\n      - "host.docker.internal:host-gateway"',
  },
]);

// ---------------------------------------------------------------- collector config
const targetsYaml = BACKEND_METRIC_TARGETS.map((t) => `              - ${t}`).join('\n');
patchFile(collectorConfigFile, [
  {
    name: 'zipkin receiver',
    marker: 'zipkin:',
    find: 'receivers:\n  otlp:',
    replace: 'receivers:\n  zipkin:\n    endpoint: 0.0.0.0:9411\n  otlp:',
  },
  {
    name: 'prometheus-скрейп бэкенда (METRICS_PORT 3031-3039)',
    marker: 'job_name: askell-backend',
    find: '      scrape_configs:\n        - job_name: otel-collector',
    replace: `      scrape_configs:
        - job_name: askell-backend
          scrape_interval: 15s
          static_configs:
            - targets:
${targetsYaml}
              labels:
                job_name: askell-backend
        - job_name: otel-collector`,
  },
  {
    name: 'zipkin в pipeline traces',
    marker: 'receivers: [otlp, zipkin]',
    find: /(pipelines:\n    traces:\n      receivers: )\[otlp\]/,
    replace: '$1[otlp, zipkin]',
  },
]);

log('Готово. Запуск: pnpm signoz:up ; UI: http://localhost:3301');
