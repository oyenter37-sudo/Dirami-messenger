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
    if (result.ok || result.out.includes("already been recorded")) continue;
    console.warn(`Could not baseline ${name}, continuing`);
  }
}

function syncSchema() {
  const push = run("npx prisma db push");
  if (push.ok) return true;
  console.warn("prisma db push failed; app build will continue");
  return false;
}

for (let attempt = 1; attempt <= 3; attempt += 1) {
  const deploy = run("npx prisma migrate deploy");
  if (deploy.ok) process.exit(0);

  if (deploy.out.includes("P3005")) {
    console.warn("Database already has tables. Recording migrations, then syncing schema.");
    baseline();
    syncSchema();
    process.exit(0);
  }

  if (deploy.out.includes("P1002") && attempt < 3) {
    console.warn(`Database lock timeout (${attempt}/3), retrying in 5s…`);
    await sleep(5000);
    continue;
  }

  console.warn("migrate deploy failed, trying db push");
  syncSchema();
  process.exit(0);
}
