import Fastify from "fastify";
import { api, MemoryRepository } from "./service.js";
const token = process.env.LOCAL_API_TOKEN;
if (!token || token.length < 24)
  throw new Error(
    "Set LOCAL_API_TOKEN to a random 24+ character local-only value.",
  );
const app = Fastify({ bodyLimit: 16384 });
const handle = api(new MemoryRepository());
app.all("/*", async (req, reply) => {
  const result = await handle({
    method: req.method,
    path: req.url,
    body: req.body ? JSON.stringify(req.body) : undefined,
    idempotencyKey: String(req.headers["idempotency-key"] ?? ""),
    actor:
      req.headers.authorization === `Bearer ${token}`
        ? {
            id: "synthetic-local-user",
            roles: ["requester", "approver", "reader"],
          }
        : undefined,
  });
  return reply.code(result.statusCode).send(result.body);
});
await app.listen({ host: "127.0.0.1", port: 3101 });
