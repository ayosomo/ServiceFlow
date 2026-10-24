import Fastify from "fastify";
import { api, MemoryRepository } from "./service.js";
const token = process.env.LOCAL_API_TOKEN;
const approverToken = process.env.LOCAL_APPROVER_TOKEN;
if (
  !token ||
  token.length < 24 ||
  !approverToken ||
  approverToken.length < 24 ||
  token === approverToken
)
  throw new Error(
    "Set distinct random 24+ character LOCAL_API_TOKEN and LOCAL_APPROVER_TOKEN values.",
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
            id: "synthetic-local-requester",
            roles: ["requester", "reader"],
          }
        : req.headers.authorization === `Bearer ${approverToken}`
          ? { id: "synthetic-local-approver", roles: ["approver", "reader"] }
          : undefined,
  });
  return reply.code(result.statusCode).send(result.body);
});
await app.listen({ host: "127.0.0.1", port: 3101 });
