import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";

function run(command) {
  try {
    const out = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (out) process.stdout.write(out);
    return { ok: true, out };
  } catch (error) {
    const out = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    if (out) process.stdout.write(out);
    return { ok: false, out };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function migrationNames() {
  return readdirSync("prisma/migrations")
    .filter((name) => name !== "migration_lock.toml" && !name.startsWith("."))
    .sort();
}

function baseline() {
  for (const name of migrationNames()) {
    console.log(`Baselining ${name}`);
    const result = run(`npx prisma migrate resolve --applied "${name}"`);
    if (!result.ok && !result.out.includes("already been recorded")) {
      throw new Error(`Failed to baseline ${name}`);
    }
  }
}

let last = { ok: false, out: "" };

for (let attempt = 1; attempt <= 4; attempt += 1) {
  last = run("npx prisma migrate deploy");
  if (last.ok) process.exit(0);

  if (last.out.includes("P3005")) {
    console.warn("Database already has tables. Recording migrations as applied, then syncing schema.");
    baseline();
    const push = run("npx prisma db push");
    process.exit(push.ok ? 0 : 1);
  }

  if (last.out.includes("P1002") && attempt < 4) {
    console.warn(`Database lock timeout (${attempt}/4), retrying in 5s…`);
    await sleep(5000);
    continue;
  }

  break;
}

console.error("prisma migrate deploy failed");
process.exit(1);
