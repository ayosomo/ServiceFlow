import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  writeFile,
  readFile,
  readdir,
  lstat,
  rename,
  unlink,
} from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { z } from "zod";

const sha = z.string().regex(/^[a-f0-9]{64}$/);
const file = z
  .object({
    bytes: z
      .number()
      .int()
      .positive()
      .max(15 * 1024 * 1024),
    sha256: sha,
  })
  .strict();
const manifestSchema = z
  .object({
    format: z.literal(1),
    runtime: z.literal("nodejs22.x"),
    handler: z.literal("lambda.handler"),
    requestIdContract: z.literal("legacy-or-uuid-v1"),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
    workingTreeDirty: z.boolean(),
    files: z.object({ "lambda.js": file, "package.json": file }).strict(),
  })
  .strict();
const packageBytes = Buffer.from('{"type":"commonjs"}\n');
export const digest = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
export type VerifiedArtifact = {
  directory: string;
  manifestSHA256: string;
  manifest: z.infer<typeof manifestSchema>;
};

export function describeArtifact(
  bundle: Uint8Array,
  source: { sourceCommit: string; workingTreeDirty: boolean },
) {
  const manifest = manifestSchema.parse({
    format: 1,
    runtime: "nodejs22.x",
    handler: "lambda.handler",
    requestIdContract: "legacy-or-uuid-v1",
    ...source,
    files: {
      "lambda.js": { bytes: bundle.length, sha256: digest(bundle) },
      "package.json": {
        bytes: packageBytes.length,
        sha256: digest(packageBytes),
      },
    },
  });
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  return { manifest, bytes, manifestSHA256: digest(bytes) };
}

export async function prepareArtifact(
  directory: string,
  bundle: Uint8Array,
  source: { sourceCommit: string; workingTreeDirty: boolean },
) {
  const description = describeArtifact(bundle, source);
  // Exclusive creation: never overwrite an existing candidate or symlink target.
  await mkdir(directory);
  await writeFile(join(directory, "lambda.js"), bundle, { flag: "wx" });
  await writeFile(join(directory, "package.json"), packageBytes, {
    flag: "wx",
  });
  await writeFile(join(directory, "manifest.json"), description.bytes, {
    flag: "wx",
  });
  return verifyArtifact(directory, description.manifestSHA256);
}

export async function verifyArtifact(
  directory: string,
  trustedManifestSHA256: string,
): Promise<VerifiedArtifact> {
  sha.parse(trustedManifestSHA256);
  const info = await lstat(directory);
  assert(
    info.isDirectory() && !info.isSymbolicLink(),
    "Artifact must be a real directory",
  );
  const entries = await readdir(directory, { withFileTypes: true });
  assert.deepEqual(entries.map((e) => e.name).sort(), [
    "lambda.js",
    "manifest.json",
    "package.json",
  ]);
  assert(
    entries.every((e) => e.isFile() && !e.isSymbolicLink()),
    "No links, directories or unexpected payloads",
  );
  const manifestPath = join(directory, "manifest.json");
  assert((await lstat(manifestPath)).size <= 32768, "Manifest too large");
  const bytes = await readFile(manifestPath);
  assert.equal(
    digest(bytes),
    trustedManifestSHA256,
    "Manifest digest differs from trusted expected value",
  );
  const manifest = manifestSchema.parse(JSON.parse(bytes.toString("utf8")));
  for (const name of ["lambda.js", "package.json"] as const) {
    const expected = manifest.files[name];
    assert.equal(
      (await lstat(join(directory, name))).size,
      expected.bytes,
      `Payload size mismatch: ${name}`,
    );
    const payload = await readFile(join(directory, name));
    assert.equal(
      digest(payload),
      expected.sha256,
      `Payload digest mismatch: ${name}`,
    );
    if (name === "package.json")
      assert(
        payload.equals(packageBytes),
        "Only the fixed CommonJS package descriptor is allowed",
      );
  }
  // Integrity inspection never imports or executes the candidate's code.
  return { directory, manifestSHA256: trustedManifestSHA256, manifest };
}

const journalEntrySchema = z
  .object({
    sequence: z.number().int().min(1).max(1000),
    previousSHA256: sha.nullable(),
    manifestSHA256: sha,
  })
  .strict();
async function readJournal(
  path: string,
): Promise<{ current: string | null; sequence: number }> {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { current: null, sequence: 0 };
    throw error;
  }
  assert(
    info.isDirectory() && !info.isSymbolicLink(),
    "Release journal must be a real directory",
  );
  const entries = await readdir(path, { withFileTypes: true });
  assert(
    entries.length <= 1100 &&
      entries.every((entry) => entry.isFile() && !entry.isSymbolicLink()),
    "Invalid release journal entries",
  );
  assert(
    entries.every(
      (entry) =>
        /^[0-9]{10}\.json$/.test(entry.name) ||
        /^candidate-[a-f0-9-]{36}\.tmp$/.test(entry.name),
    ),
    "Unexpected journal entry",
  );
  const records = entries
    .filter((entry) => entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name));
  assert(records.length <= 1000, "Local journal limit reached");
  let current: string | null = null,
    sequence = 0;
  for (const record of records) {
    const file = join(path, record.name);
    assert((await lstat(file)).size <= 4096, "Journal entry too large");
    const entry = journalEntrySchema.parse(
      JSON.parse(await readFile(file, "utf8")),
    );
    assert.equal(entry.sequence, sequence + 1, "Journal sequence gap");
    assert.equal(
      record.name,
      `${String(entry.sequence).padStart(10, "0")}.json`,
    );
    assert.equal(entry.previousSHA256, current, "Broken promotion history");
    current = entry.manifestSHA256;
    sequence = entry.sequence;
  }
  return { current, sequence };
}
export async function readPointer(path: string): Promise<string | null> {
  return (await readJournal(path)).current;
}

export async function promoteLocalArtifact(
  journalPath: string,
  directory: string,
  trustedManifestSHA256: string,
  expectedPrevious: string | null,
  smoke: (artifact: VerifiedArtifact) => Promise<void>,
) {
  const artifact = await verifyArtifact(directory, trustedManifestSHA256);
  await smoke(artifact);
  const lockPath = `${journalPath}.lock`;
  const lock = await import("node:fs/promises").then((fs) =>
    fs.open(lockPath, "wx"),
  );
  let temporary: string | undefined;
  try {
    const previous = await readJournal(journalPath);
    assert.equal(
      previous.current,
      expectedPrevious,
      "Stale local promotion rejected",
    );
    const entry = journalEntrySchema.parse({
      sequence: previous.sequence + 1,
      previousSHA256: previous.current,
      manifestSHA256: trustedManifestSHA256,
    });
    if (previous.sequence === 0) {
      try {
        await mkdir(journalPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    }
    temporary = join(journalPath, `candidate-${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(entry) + "\n", { flag: "wx" });
    // Publish a new immutable entry; never replace/delete the last known release.
    await rename(
      temporary,
      join(journalPath, `${String(entry.sequence).padStart(10, "0")}.json`),
    );
  } finally {
    await lock.close();
    await unlink(lockPath);
    if (temporary)
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
  }
  return artifact;
}
