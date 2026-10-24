import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { expect, it } from "vitest";
import assert from "node:assert/strict";
import {
  prepareArtifact,
  verifyArtifact,
  promoteLocalArtifact,
  readPointer,
} from "../src/index.js";

const source = { sourceCommit: "a".repeat(40), workingTreeDirty: true };
async function workspace(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "serviceflow-release-test-"));
  try {
    await run(root);
  } finally {
    assert(
      dirname(resolve(root)) === resolve(tmpdir()) &&
        root.includes("serviceflow-release-test-"),
      "Unexpected cleanup path",
    );
    await rm(root, { recursive: true, force: true });
  }
}
it("BA-012 identical inputs produce identical artifact manifests and existing candidates are not overwritten", () =>
  workspace(async (root) => {
    const a = await prepareArtifact(
      join(root, "a"),
      Buffer.from("exports.handler = async () => 'synthetic-a';"),
      source,
    );
    const b = await prepareArtifact(
      join(root, "b"),
      Buffer.from("exports.handler = async () => 'synthetic-a';"),
      source,
    );
    expect(a.manifestSHA256).toBe(b.manifestSHA256);
    await expect(
      prepareArtifact(join(root, "a"), Buffer.from("different"), source),
    ).rejects.toThrow();
    expect(
      (await verifyArtifact(a.directory, a.manifestSHA256)).manifest,
    ).toEqual(a.manifest);
  }));
it.each(["lambda.js", "manifest.json", "package.json"])(
  "BA-012 rejects altered %s against an independently retained manifest digest",
  (name) =>
    workspace(async (root) => {
      const a = await prepareArtifact(
        join(root, "a"),
        Buffer.from("exports.handler = async () => 'synthetic';"),
        source,
      );
      const path = join(a.directory, name),
        bytes = await readFile(path);
      await writeFile(path, Buffer.alloc(bytes.length, 0x78));
      await expect(
        verifyArtifact(a.directory, a.manifestSHA256),
      ).rejects.toThrow();
    }),
);
it("BA-012 rejects extra/nested payloads and a wrong expected digest without executing candidate code", () =>
  workspace(async (root) => {
    const a = await prepareArtifact(
      join(root, "a"),
      Buffer.from(
        "throw new Error('must not execute during integrity verification');",
      ),
      source,
    );
    await expect(
      verifyArtifact(a.directory, a.manifestSHA256),
    ).resolves.toBeDefined();
    await expect(verifyArtifact(a.directory, "0".repeat(64))).rejects.toThrow();
    await mkdir(join(a.directory, "unexpected"));
    await expect(
      verifyArtifact(a.directory, a.manifestSHA256),
    ).rejects.toThrow();
  }));
it("BA-012 rejects unhealthy or stale promotion and rolls a local pointer back to a verified earlier artifact", () =>
  workspace(async (root) => {
    const a = await prepareArtifact(
      join(root, "a"),
      Buffer.from("exports.handler = async () => 'synthetic-a';"),
      source,
    );
    const b = await prepareArtifact(
      join(root, "b"),
      Buffer.from("exports.handler = async () => 'synthetic-b';"),
      source,
    );
    const pointer = join(root, "promotion-journal"),
      healthy = async () => {};
    await promoteLocalArtifact(
      pointer,
      a.directory,
      a.manifestSHA256,
      null,
      healthy,
    );
    await expect(
      promoteLocalArtifact(
        pointer,
        b.directory,
        b.manifestSHA256,
        a.manifestSHA256,
        async () => {
          throw new Error("unhealthy synthetic candidate");
        },
      ),
    ).rejects.toThrow();
    expect(await readPointer(pointer)).toBe(a.manifestSHA256);
    await expect(
      promoteLocalArtifact(
        pointer,
        b.directory,
        b.manifestSHA256,
        null,
        healthy,
      ),
    ).rejects.toThrow();
    await promoteLocalArtifact(
      pointer,
      b.directory,
      b.manifestSHA256,
      a.manifestSHA256,
      healthy,
    );
    expect(await readPointer(pointer)).toBe(b.manifestSHA256);
    await promoteLocalArtifact(
      pointer,
      a.directory,
      a.manifestSHA256,
      b.manifestSHA256,
      healthy,
    );
    expect(await readPointer(pointer)).toBe(a.manifestSHA256);
  }));
it("BA-012 a cooperating-process promotion lock fails closed without deleting another holder's lock", () =>
  workspace(async (root) => {
    const a = await prepareArtifact(
      join(root, "a"),
      Buffer.from("exports.handler=async()=> 'synthetic';"),
      source,
    );
    const pointer = join(root, "promotion-journal");
    await writeFile(`${pointer}.lock`, "synthetic-holder", { flag: "wx" });
    await expect(
      promoteLocalArtifact(
        pointer,
        a.directory,
        a.manifestSHA256,
        null,
        async () => {},
      ),
    ).rejects.toThrow();
    expect(await readPointer(pointer)).toBeNull();
    await expect(
      writeFile(`${pointer}.lock`, "probe", { flag: "wx" }),
    ).rejects.toThrow();
  }));
