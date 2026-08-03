import { spawnSync } from "node:child_process";

if (process.env.RUN_SEED_ON_DEPLOY !== "true") {
  console.info("Preview seed skipped. Set RUN_SEED_ON_DEPLOY=true to run it once.");
  process.exit(0);
}

if (process.env.VERCEL_ENV === "production") {
  throw new Error(
    "RUN_SEED_ON_DEPLOY is blocked in Production. Use the approved production recovery procedure instead.",
  );
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["run", "db:seed"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`Preview seed failed with exit code ${result.status ?? "unknown"}.`);
}

console.info("Preview seed completed successfully.");
