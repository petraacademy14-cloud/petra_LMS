import { spawnSync } from "node:child_process";

const isProduction = process.env.VERCEL_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";
const runFullSeed = process.env.RUN_SEED_ON_DEPLOY === "true";
const isWebsitePreview = process.env.VERCEL_GIT_COMMIT_REF?.startsWith("website/");
const hasPreviewStaffPassword = Boolean(process.env.SEED_OWNER_PASSWORD);

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

// Verify preview staff only where credentials have been explicitly configured.
// Feature previews must remain deployable without inheriting test credentials
// from another branch or environment.
if (isPreview && !isWebsitePreview && hasPreviewStaffPassword) {
  runScript("db:create-preview-teacher");
  console.info("Preview Owner and Teacher logins verified successfully.");
} else if (isWebsitePreview) {
  console.info("Preview account verification skipped for website branch.");
} else if (isPreview) {
  console.info("Preview account verification skipped because credentials are not configured.");
}
