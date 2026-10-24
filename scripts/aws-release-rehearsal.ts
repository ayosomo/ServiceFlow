import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  prepareArtifact,
  verifyArtifact,
  promoteLocalArtifact,
  readPointer,
  type VerifiedArtifact,
} from "../packages/release/src/index.js";
import { MemoryRepository } from "../apps/aws-request-approvals/src/service.js";
import type {
  GatewayEvent,
  gatewayHandler,
} from "../apps/aws-request-approvals/src/lambda.js";
import { generatedRequestIdSchema } from "../packages/domain/src/index.js";

const root = process.cwd(),
  startedAtUTC = new Date().toISOString();
const directory = join(root, "work", `aws-release-rehearsal-${Date.now()}`);
await mkdir(directory, { recursive: true });
const source = {
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  workingTreeDirty: !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
};
const bundle = await readFile("apps/aws-request-approvals/dist/lambda.js");
const appArtifact = await prepareArtifact(
  join(directory, "application"),
  bundle,
  source,
);
const repeat = await prepareArtifact(
  join(directory, "same-input"),
  bundle,
  source,
);
assert.equal(appArtifact.manifestSHA256, repeat.manifestSHA256);
const load = createRequire(import.meta.url);
const smokeRuns: {
  generatedId: string;
  create: number;
  replayCreate: number;
  selfDecision: number;
  decision: number;
  replayDecision: number;
  auditEvents: number;
}[] = [];
async function applicationSmoke(artifact: VerifiedArtifact) {
  // Only this task's own prepared bundle is loaded after verification. Never import arbitrary untrusted candidates.
  const mod = load(join(artifact.directory, "lambda.js")) as {
    handler: unknown;
    gatewayHandler: typeof gatewayHandler;
  };
  assert.equal(typeof mod.handler, "function");
  assert.equal(typeof mod.gatewayHandler, "function");
  const names = ["REQUESTER_ARNS", "APPROVER_ARNS", "READER_ARNS"];
  const previous = names.map((name) => process.env[name]);
  process.env.REQUESTER_ARNS = "synthetic-release-requester";
  process.env.APPROVER_ARNS =
    "synthetic-release-requester,synthetic-release-approver";
  process.env.READER_ARNS = "";
  try {
    const repo = new MemoryRepository(),
      run = mod.gatewayHandler(repo, () => {});
    const event = (
      path: string,
      body: unknown,
      actor: string,
      key: string,
    ): GatewayEvent => ({
      rawPath: path,
      body: JSON.stringify(body),
      headers: { "idempotency-key": key },
      requestContext: {
        http: { method: "POST" },
        requestId: key,
        authorizer: { iam: { userArn: actor } },
      },
    });
    const create = event(
      "/requests",
      {
        customerId: "SYN-602",
        summary: "Synthetic packaged artifact smoke",
        ownerTeam: "Operations",
        priority: "HIGH",
        submittedAt: "2026-10-01T00:00:00.000Z",
        targetAt: "2026-10-30T00:00:00.000Z",
        approvalRequired: true,
      },
      "synthetic-release-requester",
      "artifact_create",
    );
    const created = await run(create);
    assert.equal(created.statusCode, 201);
    const id = generatedRequestIdSchema.parse(
      JSON.parse(created.body).requestId,
    );
    const replayCreate = await run(create);
    assert.equal(replayCreate.body, created.body);
    const body = {
      decision: "APPROVED",
      reason: "Synthetic separate actor",
      version: 1,
    };
    const self = await run(
      event(
        `/requests/${id}/decision`,
        body,
        "synthetic-release-requester",
        "artifact_self",
      ),
    );
    assert.equal(self.statusCode, 403);
    const decide = event(
      `/requests/${id}/decision`,
      body,
      "synthetic-release-approver",
      "artifact_decision",
    );
    const approved = await run(decide),
      replay = await run(decide);
    assert.equal(approved.statusCode, 200);
    assert.equal(replay.body, approved.body);
    const reread = await repo.get(id);
    assert.equal(reread?.events.length, 2);
    assert.equal(reread?.request.version, 2);
    smokeRuns.push({
      generatedId: id,
      create: created.statusCode,
      replayCreate: replayCreate.statusCode,
      selfDecision: self.statusCode,
      decision: approved.statusCode,
      replayDecision: replay.statusCode,
      auditEvents: reread.events.length,
    });
  } finally {
    names.forEach((name, i) => {
      if (previous[i] === undefined) delete process.env[name];
      else process.env[name] = previous[i];
    });
  }
}
const journal = join(directory, "promotion-journal");
await promoteLocalArtifact(
  journal,
  appArtifact.directory,
  appArtifact.manifestSHA256,
  null,
  applicationSmoke,
);
const tampered = await prepareArtifact(
  join(directory, "tampered"),
  bundle,
  source,
);
await writeFile(
  join(tampered.directory, "lambda.js"),
  Buffer.alloc(bundle.length, 0x78),
);
let tamperedCodeLoaded = false;
await assert.rejects(
  promoteLocalArtifact(
    journal,
    tampered.directory,
    tampered.manifestSHA256,
    appArtifact.manifestSHA256,
    async () => {
      tamperedCodeLoaded = true;
    },
  ),
);
assert.equal(tamperedCodeLoaded, false);
assert.equal(await readPointer(journal), appArtifact.manifestSHA256);
const unhealthy = await prepareArtifact(
  join(directory, "unhealthy"),
  Buffer.from("exports.handler = async () => ({statusCode:503});"),
  source,
);
await verifyArtifact(unhealthy.directory, unhealthy.manifestSHA256);
await assert.rejects(
  promoteLocalArtifact(
    journal,
    unhealthy.directory,
    unhealthy.manifestSHA256,
    appArtifact.manifestSHA256,
    applicationSmoke,
  ),
);
assert.equal(await readPointer(journal), appArtifact.manifestSHA256);
const syntheticCandidate = await prepareArtifact(
  join(directory, "synthetic-candidate"),
  Buffer.from(
    "exports.handler=async()=>({statusCode:200}); exports.marker='synthetic-candidate-b';",
  ),
  source,
);
const fixtureSmoke = async (artifact: VerifiedArtifact) => {
  assert.equal(
    load(join(artifact.directory, "lambda.js")).marker,
    "synthetic-candidate-b",
  );
};
await assert.rejects(
  promoteLocalArtifact(
    journal,
    syntheticCandidate.directory,
    syntheticCandidate.manifestSHA256,
    null,
    fixtureSmoke,
  ),
);
assert.equal(await readPointer(journal), appArtifact.manifestSHA256);
await promoteLocalArtifact(
  journal,
  syntheticCandidate.directory,
  syntheticCandidate.manifestSHA256,
  appArtifact.manifestSHA256,
  fixtureSmoke,
);
assert.equal(await readPointer(journal), syntheticCandidate.manifestSHA256);
await promoteLocalArtifact(
  journal,
  appArtifact.directory,
  appArtifact.manifestSHA256,
  syntheticCandidate.manifestSHA256,
  applicationSmoke,
);
assert.equal(await readPointer(journal), appArtifact.manifestSHA256);
const entries = (await readdir(journal)).filter((n) => n.endsWith(".json"));
assert.equal(entries.length, 3);
const evidence = {
  startedAtUTC,
  completedAtUTC: new Date().toISOString(),
  passed: true,
  source,
  artifact: {
    directory: relative(root, appArtifact.directory).replaceAll("\\", "/"),
    manifestSHA256: appArtifact.manifestSHA256,
    manifest: appArtifact.manifest,
  },
  sameInputsProduceSameManifest: true,
  actualApplicationBundleSmoke: smokeRuns,
  tamperedPayloadRejectedBeforeCodeLoad: !tamperedCodeLoaded,
  validChecksumUnhealthyFixtureRejected: true,
  stalePromotionRejected: true,
  journalEntries: entries.length,
  rolledBackToOriginalArtifact: true,
  intermediateCandidateWasSyntheticFixture: true,
  workArtifactsRetainedForReview: true,
  cloudCalls: false,
  cloudDeployments: [],
  limitations: [
    "Actual packaged Lambda factory is tested using synthetic gateway context and memory persistence, not platform IAM or live AWS.",
    "The intermediate candidate is a labelled synthetic fixture, not a second released application version.",
    "Rollback changes a local append-only journal only; no infrastructure, database/schema or real traffic rollback is proved.",
    "Expected digests and smoke callbacks are operator-controlled local inputs, not signed/protected CI attestations or owner deployment approval.",
  ],
};
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/aws-readiness-3-release-rehearsal.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  "PASS: built artifact integrity/UUID/security smoke, tamper/unhealthy/stale rejection, and three-entry local promotion/rollback journal. No cloud calls.",
);
