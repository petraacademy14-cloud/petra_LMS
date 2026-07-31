const base = (process.env.PRODUCTION_URL ?? "https://petra-lms.vercel.app").replace(/\/$/, "");
const targets = [
  ["/login", "text/html"],
  ["/updates", "text/html"],
  ["/api/health", "application/json"],
];
let failed = false;
for (const [path, expectedType] of targets) {
  try {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(15000), redirect: "follow" });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.includes(expectedType)) {
      console.error(JSON.stringify({ path, status: response.status, contentType: type, ok: false }));
      failed = true;
      continue;
    }
    if (path === "/api/health") {
      const health = await response.json();
      if (health.status !== "ok" || health.database !== "reachable") failed = true;
      console.info(JSON.stringify({ path, status: response.status, health: health.status, database: health.database }));
    } else {
      console.info(JSON.stringify({ path, status: response.status, ok: true }));
    }
  } catch (error) {
    console.error(JSON.stringify({ path, ok: false, error: error instanceof Error ? error.message : String(error) }));
    failed = true;
  }
}
if (failed) process.exitCode = 1;
