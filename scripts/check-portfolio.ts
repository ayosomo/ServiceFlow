import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Checks repository links without network access or cloud credentials.
const root = process.cwd();
async function markdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    if (
      ["node_modules", ".git", "dist", "work", ".aws-sam"].includes(entry.name)
    )
      continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await markdown(path)));
    else if (entry.name.endsWith(".md")) paths.push(path);
  }
  return paths;
}
const files = await markdown(root);
const errors: string[] = [];
let links = 0;
for (const file of files) {
  const content = (await readFile(file, "utf8")).replace(/```[\s\S]*?```/g, "");
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1]!.replace(/^<|>$/g, "").split(/\s+"/)[0]!;
    if (/^(?:https?:|mailto:|#)/.test(raw)) continue;
    links++;
    try {
      const target = resolve(
        dirname(file),
        decodeURIComponent(raw.split("#")[0]!),
      );
      const inside = relative(root, target);
      assert(
        !inside.startsWith("..") && !isAbsolute(inside),
        "link leaves repository",
      );
      await stat(target);
    } catch {
      errors.push(
        `${relative(root, file)}: missing or out-of-repository target ${raw}`,
      );
    }
  }
}
const deployment = await readFile("docs/DEPLOYMENT-EVIDENCE.md", "utf8");
assert(
  deployment.includes("NOT VERIFIED"),
  "Keep unverified cloud status explicit",
);
assert.equal(errors.length, 0, errors.join("\n"));
async function verifyHash(file: string, expected: string) {
  const target = resolve(root, file),
    inside = relative(root, target);
  assert(
    !inside.startsWith("..") && !isAbsolute(inside),
    "evidence leaves repository",
  );
  assert.match(expected, /^[a-f0-9]{64}$/);
  assert.equal(
    createHash("sha256")
      .update(await readFile(target))
      .digest("hex"),
    expected,
    `Evidence hash mismatch: ${file}`,
  );
}
const sources = JSON.parse(
  await readFile("docs/evidence/screenshots/sources.json", "utf8"),
) as { views: { sources: { file: string; sha256: string }[] }[] };
for (const view of sources.views)
  for (const source of view.sources)
    await verifyHash(source.file, source.sha256);
const captures = JSON.parse(
  await readFile("docs/evidence/screenshots/captures.json", "utf8"),
) as { captures: { image: string; sha256: string }[] };
for (const capture of captures.captures)
  await verifyHash(
    `docs/evidence/screenshots/${capture.image}`,
    capture.sha256,
  );
console.log(
  `PASS: ${links} local Markdown/image targets across ${files.length} files exist inside the repository; screenshot/source hashes match. External URLs and anchor fragments are not validated by this check.`,
);
