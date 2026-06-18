import ApiGateway from "moleculer-web";
import { ServiceBroker } from "moleculer";
import { verifyAccessToken } from "../lib/auth.js";
import { hasRole } from "@askell/shared/roles";

const { UnAuthorizedError, ForbiddenError, ERR_NO_TOKEN, ERR_INVALID_TOKEN } =
  ApiGateway.Errors;

const broker = new ServiceBroker({
  nodeID: "gateway",
  transporter: "nats://localhost:4222",
  logger: true
});

broker.createService({
  mixins: [ApiGateway],

  settings: {
    port: 6789,
    routes: [
      {
        path: "/api",
        // Routes are auto-discovered from each service's `rest` action
        // metadata; access is declared per action (`auth: false` / `roles`).
        autoAliases: true,
        // Only expose our own services (keeps moleculer-web internals like
        // `api.listAliases` and `$node.*` off the public surface).
        whitelist: ["users.*", "proxy.*", "data-refresher.*"],
        authentication: true,
        authorization: true,
        bodyParsers: { json: true }
      }
    ]
  },

  methods: {
    /**
     * Verify the Bearer token and return the user (-> ctx.meta.user), or null
     * for anonymous requests. Public actions (`auth: false`) never fail here.
     */
    async authenticate(ctx, route, req) {
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
     *   - `auth: false`  -> public, no token required
     *   - `roles: [...]` -> requires one of these roles (admin always passes)
     *   - neither        -> any authenticated user
     */
    async authorize(ctx, route, req) {
      const action = req.$action;
      if (action?.auth === false) return;

      const user = ctx.meta.user;
      if (!user) throw new UnAuthorizedError(ERR_NO_TOKEN);

      if (!hasRole(user, action?.roles)) {
        throw new ForbiddenError("FORBIDDEN", { action: action?.name, required: action?.roles });
      }
    }
  }
});

broker.start();