import { spawnSync } from "node:child_process";

const isProduction = process.env.VERCEL_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";
const runFullSeed = process.env.RUN_SEED_ON_DEPLOY === "true";
const isWebsitePreview = process.env.VERCEL_GIT_COMMIT_REF?.startsWith("website/");
const hasPreviewAccessPassword = Boolean(
  process.env.SEED_PREVIEW_ACCESS_PASSWORD ?? process.env.SEED_OWNER_PASSWORD,
);

if (isProduction && runFullSeed) {
  throw new Error(
    "RUN_SEED_ON_DEPLOY is blocked in Production. Use the approved production recovery procedure instead.",
  );
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runScript(scriptName) {
  const result = spawnSync(npmCommand, ["run", scriptName], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${scriptName} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

if (runFullSeed && !isWebsitePreview) {
  runScript("db:seed");
  console.info("Preview seed completed successfully.");
} else {
  console.info("Full Preview seed skipped for this deployment.");
}

// Keep the four fixed test portals usable on every Preview deployment that has
// explicitly configured credentials, including the public-website branches.
if (isPreview && hasPreviewAccessPassword) {
  runScript("db:ensure-preview-accounts");
  console.info("Preview Owner, Teacher, Student and Parent logins verified successfully.");
} else if (isPreview) {
  console.info("Preview account verification skipped because credentials are not configured.");
}
