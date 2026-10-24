import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, cp, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import pg from "pg";
const run = promisify(execFile),
  scratch = resolve(process.env.LAB_WORK_DIR ?? "work");
const require = createRequire(import.meta.url),
  embedded = createRequire(require.resolve("embedded-postgres"));
const platform = process.platform === "win32" ? "windows" : process.platform;
const native = resolve(
  dirname(embedded.resolve(`@embedded-postgres/${platform}-${process.arch}`)),
  "../native",
);
// Shorten the Windows package path: PostgreSQL's file APIs can hit MAX_PATH
// in pnpm's nested tree. Copy only inside this dedicated scratch area.
const binaries = resolve(scratch, "postgres-binaries"),
  directory = resolve(scratch, "native-postgres");
await mkdir(scratch, { recursive: true });
if (
  !existsSync(
    resolve(
      binaries,
      "bin",
      process.platform === "win32" ? "postgres.exe" : "postgres",
    ),
  )
)
  await cp(native, binaries, { recursive: true });
const executable = (name: string) =>
  resolve(binaries, "bin", name + (process.platform === "win32" ? ".exe" : ""));
const options = { windowsHide: true, timeout: 60000 };
if (!existsSync(resolve(directory, "PG_VERSION"))) {
  const passwordFile = resolve(scratch, "postgres-local-password.txt");
  await writeFile(passwordFile, "local-synthetic-only\n");
  try {
    await run(
      executable("initdb"),
      [
        "-D",
        directory,
        "-U",
        "serviceflow",
        "-A",
        "scram-sha-256",
        "--pwfile",
        passwordFile,
        "-E",
        "UTF8",
        "--no-locale",
        "-L",
        resolve(binaries, "share"),
        "-c",
        `extension_control_path=${resolve(binaries, "share").replaceAll("\\", "/")}`,
      ],
      options,
    );
  } finally {
    await unlink(passwordFile);
  }
}
await run(
  executable("pg_ctl"),
  [
    "-D",
    directory,
    "-l",
    resolve(scratch, "postgres.log"),
    "-o",
    "-p 55432 -h 127.0.0.1",
    "-w",
    "start",
  ],
  options,
);
try {
  const client = new pg.Client({
    user: "serviceflow",
    password: "local-synthetic-only",
    host: "127.0.0.1",
    port: 55432,
    database: "postgres",
  });
  await client.connect();
  const version = await client.query("SELECT version()");
  if (
    !(
      await client.query(
        "SELECT 1 FROM pg_database WHERE datname='serviceflow'",
      )
    ).rowCount
  )
    await client.query("CREATE DATABASE serviceflow");
  await client.end();
  await mkdir("docs/evidence", { recursive: true });
  const evidence = [
    `Portable native PostgreSQL (not Docker): ${new Date().toISOString()}`,
    String(version.rows[0].version),
  ];
  for (const mode of [
    "migrate",
    "migrate",
    "seed",
    "seed",
    "test",
    "explain",
  ]) {
    const result = await run(
      process.execPath,
      ["--import", "tsx", "db/run.ts", mode],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL:
            "postgresql://serviceflow:local-synthetic-only@127.0.0.1:55432/serviceflow",
        },
        timeout: 30000,
      },
    );
    evidence.push(
      `COMMAND: pnpm db:${mode}\nEXIT: 0\n${result.stdout}${result.stderr}`,
    );
  }
  await writeFile(
    "docs/evidence/postgres-native.txt",
    evidence.join("\n") + "\n",
  );
  console.log(evidence.join("\n"));
} finally {
  await run(
    executable("pg_ctl"),
    ["-D", directory, "-m", "fast", "-w", "stop"],
    options,
  );
  console.log(
    "Portable PostgreSQL stopped; data retained in ignored local scratch directory.",
  );
}
