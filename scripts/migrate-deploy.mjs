import { execSync } from "node:child_process";

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

for (let attempt = 1; attempt <= 3; attempt += 1) {
  const deploy = run("npx prisma migrate deploy");
  if (deploy.ok) process.exit(0);

  if (deploy.out.includes("P1002") && attempt < 3) {
    console.warn(`Database lock timeout (${attempt}/3), retrying in 5s…`);
    await sleep(5000);
    continue;
  }

  console.error(
    "Migration failed. Refusing to build against an outdated or partially migrated database.",
  );
  process.exit(1);
}
