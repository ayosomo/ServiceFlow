import { createHash, timingSafeEqual } from "node:crypto";
import { createApp, identityAuth, type Authenticate } from "./app.js";
import { FirestoreRepository, FixtureRepository } from "./repository.js";
import { fixtures } from "../../../packages/fixtures/src.js";
import { reconcile } from "../../../packages/domain/src/index.js";
async function start() {
  const local = process.env.MODE === "local";
  if (local && process.env.K_SERVICE)
    throw new Error("Local authentication mode forbidden in Cloud Run");
  const token = process.env.LOCAL_API_TOKEN;
  if (local && (!token || token.length < 24))
    throw new Error("LOCAL_API_TOKEN must be random and 24+ characters");
  if (!local && (!process.env.API_AUDIENCE || !process.env.ALLOWED_EMAILS))
    throw new Error("API_AUDIENCE and ALLOWED_EMAILS are required");
  const f = fixtures(),
    hash = (s: string) => createHash("sha256").update(s).digest();
  const authenticate: Authenticate = local
    ? async (auth) =>
        auth && timingSafeEqual(hash(auth), hash(`Bearer ${token}`))
          ? "synthetic-local-manager"
          : null
    : identityAuth(
        process.env.API_AUDIENCE!,
        process.env.ALLOWED_EMAILS!.split(","),
      );
  const app = createApp(
    local && !process.env.FIRESTORE_EMULATOR_HOST
      ? new FixtureRepository({
          requests: f.crm,
          findings: reconcile(f.crm, f.supplier),
          sourceHash: hash(JSON.stringify(f.crm)).toString("hex"),
        })
      : new FirestoreRepository(),
    authenticate,
  );
  await app.listen({
    host: process.env.BIND_HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 8080),
  });
  console.log(
    JSON.stringify({
      event: "listening",
      mode: local
        ? process.env.FIRESTORE_EMULATOR_HOST
          ? "local-firestore-emulator"
          : "synthetic-local"
        : "firestore",
      port: Number(process.env.PORT ?? 8080),
    }),
  );
}
start().catch(() => {
  console.error(JSON.stringify({ event: "startup_failed" }));
  process.exitCode = 1;
});
