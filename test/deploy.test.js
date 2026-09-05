import { expect, test } from "bun:test";
import { unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `bun run deploy` imports the command modules to read their definitions. That
// must not open the database: it would create a stray file and race a running
// bot for the write lock (SQLITE_BUSY on the WAL pragma).
test("importing the command modules does not touch the database", async () => {
  const path = join(tmpdir(), `rr-deploy-${Date.now()}.db`);
  const proc = Bun.spawnSync({
    cmd: ["bun", "-e", 'await import("./src/commands/index.js")'],
    env: { ...process.env, DATABASE_PATH: path },
    cwd: import.meta.dir + "/..",
  });

  expect(proc.exitCode).toBe(0);
  const created = existsSync(path);
  if (created) unlinkSync(path);
  expect(created).toBe(false);
});

test("the deploy script fails on missing credentials, not on storage", () => {
  const proc = Bun.spawnSync({
    cmd: ["bun", "run", "src/deploy-commands.js"],
    env: { ...process.env, DISCORD_TOKEN: "", DISCORD_CLIENT_ID: "" },
    cwd: import.meta.dir + "/..",
  });
  const output = proc.stderr.toString() + proc.stdout.toString();
  expect(output).toContain("must both be set");
  expect(output).not.toContain("SQLITE");
});
