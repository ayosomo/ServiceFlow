import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
if (!files.length)
  throw new Error(
    "No tracked files: stage the reviewed source before scanning",
  );
const rules = [
  /AKIA[A-Z0-9]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /"private_key"\s*:\s*"[^"\n]{20}/,
];
const failures = files.filter(
  (f) =>
    f !== "scripts/check-secrets.ts" &&
    rules.some((rule) => rule.test(readFileSync(f, "utf8"))),
);
if (failures.length)
  throw new Error(
    "Potential secret in tracked file(s): " + failures.join(", "),
  );
console.log(
  `PASS: ${files.length} tracked files checked for AWS access-key IDs, private keys, GitHub tokens and GCP private-key JSON. This bounded pattern scan is not a guarantee; manual review still required.`,
);
