import ApiGateway from "moleculer-web";
import crypto from "crypto";
import { createBroker } from "../lib/broker.js";
import { verifyAccessToken } from "../users/lib/auth.js";
import { hasPermission } from "@askell/shared/permissions";

const { UnAuthorizedError, ForbiddenError, ERR_NO_TOKEN, ERR_INVALID_TOKEN } = ApiGateway.Errors;

// Запросы с этих IP проходят без Bearer-токена с правами админа
// (вебхуки МойСклад / 1С / локальные интеграции).
// ВАЖНО: сравнение идёт по req.socket.remoteAddress (не по X-Forwarded-For,
// его можно подделать). Если поставите gateway за reverse-proxy (nginx),
// уберите 127.0.0.1 из списка, иначе ВСЕ внешние запросы станут админскими.
const TRUSTED_IPS = ['23.105.238.220', '23.105.239.236'];

// Синтетический пользователь для доверенных источников.
const systemUser = (username) => ({
  id: `system:${username}`,
  username,
  fullname: `system (${username})`,
  roles: ['Админ'],
  system: true,
});

// Сравнение токенов без утечки по времени.
const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const normalizeIp = (ip) => (ip || '').replace(/^::ffff:/, '');

const broker = createBroker('gateway');

broker.createService({
  mixins: [ApiGateway],

  settings: {
    port: Number(process.env.GATEWAY_PORT || 6789),
    cors: {
      // На проде задайте CORS_ORIGIN=https://ваш-домен (можно несколько через запятую).
      origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(s => s.trim()),
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    routes: [
      {
        path: "/api",
        // Routes are auto-discovered from each service's `rest` action
        // metadata; access is declared per action (`auth: false` / `permissions`).
        autoAliases: true,
        // Only expose our own services (keeps moleculer-web internals like
        // `api.listAliases` and `$node.*` off the public surface).
        whitelist: ["users.*", "proxy.*", "data-refresher.*", "sklad.*", "sklad1c.*", "productionCompletion.*", "reports.*", "extension.*"],
        authentication: true,
        authorization: true,
        bodyParsers: { json: true },
        // 4xx-ответы попадают в логи (видно отклонённые запросы в SigNoz).
        log4XXResponses: true
      }
    ]
  },
  methods: {
    /**
     * Порядок аутентификации:
     *   1) доверенный IP                  -> система с правами админа
     *   2) ?token=  (1С, ONE_C_TOKEN)     -> система с правами админа
     *   3) ?devToken= (DEV_TOKEN)         -> система с правами админа
     *   4) Bearer JWT                     -> обычный пользователь
     * Public actions (`auth: false`) никогда не падают здесь.
     */
    async authenticate(ctx, route, req) {
      // 1) Доверенные IP
      const remoteIp = normalizeIp(req.socket?.remoteAddress);
      if (TRUSTED_IPS.includes(remoteIp)) {
        return systemUser(`trusted-ip:${remoteIp}`);
      }

      // 2-3) Токены в query-параметрах (интеграции без заголовков)
      const query = new URL(req.url, 'http://localhost').searchParams;
      const oneCToken = query.get('token');
      const devToken = query.get('devToken');
      if (oneCToken && safeEqual(oneCToken, process.env.ONE_C_TOKEN)) {
        return systemUser('1c');
      }
      if (devToken && safeEqual(devToken, process.env.DEV_TOKEN)) {
        return systemUser('dev');
      }

      // 4) Bearer JWT
      const auth = req.headers["authorization"];
      if (!auth || !auth.startsWith("Bearer ")) return null;
      try {
        return verifyAccessToken(auth.slice(7));
      } catch {
        if (req.$action?.auth === false) return null;
        throw new UnAuthorizedError(ERR_INVALID_TOKEN);
      }
    },

    /**
     * Enforce access using the action's own metadata:
     *   - `auth: false`        -> public, no token required
     *   - `permissions: [...]` -> requires one of these permissions (admin always passes)
     *   - neither              -> any authenticated user
     */
    async authorize(ctx, route, req) {
      const action = req.$action;
      if (action?.auth === false) return;

      const user = ctx.meta.user;
      if (!user) throw new UnAuthorizedError(ERR_NO_TOKEN);

      if (!hasPermission(user, action?.permissions)) {
        throw new ForbiddenError("FORBIDDEN", { action: action?.name, required: action?.permissions });
      }
    }
  }
});

broker.start();