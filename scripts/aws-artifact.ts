import { execFileSync } from "node:child_process";
import { readFile, mkdir, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  describeArtifact,
  prepareArtifact,
  verifyArtifact,
} from "../packages/release/src/index.js";

const mode = process.argv[2];
if (mode === "prepare") {
  const bundle = await readFile("apps/aws-request-approvals/dist/lambda.js");
  const source = {
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    workingTreeDirty: !!execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
    }).trim(),
  };
  for (const directory of ["work", "work/aws-artifacts"]) {
    await mkdir(directory, { recursive: true });
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error("Artifact staging must use real task-local directories");
  }
  const expected = describeArtifact(bundle, source).manifestSHA256;
  const directory = resolve("work/aws-artifacts", expected);
  let exists = false;
  try {
    await lstat(directory);
    exists = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const result = exists
    ? await verifyArtifact(directory, expected)
    : await prepareArtifact(directory, bundle, source);
  console.log(
    JSON.stringify(
      {
        kind: "Local artifact preparation/integrity only; not an approved deployment or signed CI attestation",
        directory: `work/aws-artifacts/${expected}`,
        manifestSHA256: result.manifestSHA256,
        manifest: result.manifest,
      },
      null,
      2,
    ),
  );
} else if (mode === "verify") {
  const directory = process.argv[3],
    expected = process.argv[4];
  if (!directory || !expected)
    throw new Error(
      "Usage: pnpm aws:artifact verify <directory> <trusted-manifest-sha256>",
    );
  const result = await verifyArtifact(resolve(directory), expected);
  console.log(
    JSON.stringify({
      verified: true,
      manifestSHA256: result.manifestSHA256,
      codeExecuted: false,
      cloudCalls: false,
    }),
  );
} else
  throw new Error(
    "Use pnpm aws:artifact prepare or verify <directory> <trusted-manifest-sha256>",
  );
