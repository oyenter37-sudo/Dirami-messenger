import { execSync } from "node:child_process";

const attempts = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    process.exit(0);
  } catch {
    if (attempt === attempts) {
      console.error("prisma migrate deploy failed after retries");
      process.exit(1);
    }
    console.warn(`migrate deploy timed out (${attempt}/${attempts}), retrying in 5s…`);
    await sleep(5000);
  }
}
