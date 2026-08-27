const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secret) {
  console.error(
    "SUPABASE_URL and SUPABASE_SECRET_KEY are required to prepare private storage buckets.",
  );
  process.exit(1);
}

const buckets = [
  {
    id: "student-documents",
    file_size_limit: 4_000_000,
    allowed_mime_types: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    id: "communication-media",
    file_size_limit: 5 * 1024 * 1024,
    allowed_mime_types: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },
  {
    id: "admission-documents",
    file_size_limit: 5 * 1024 * 1024,
    allowed_mime_types: ["application/pdf", "image/jpeg", "image/png"],
  },
];

function adminHeaders(contentType = false) {
  const result = { apikey: secret };

  // Legacy service_role keys are JWTs and need the bearer header. New
  // sb_secret_* keys are authenticated through the apikey header only.
  if (!secret.startsWith("sb_secret_")) {
    result.Authorization = `Bearer ${secret}`;
  }
  if (contentType) result["Content-Type"] = "application/json";
  return result;
}

async function storageRequest(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/storage/v1${path}`, {
    ...init,
    headers: {
      ...adminHeaders(Boolean(init.body)),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object"
        ? payload.message ?? payload.error ?? JSON.stringify(payload)
        : String(payload ?? response.statusText);
    throw new Error(`Storage API ${response.status}: ${detail}`);
  }

  return payload;
}

const existing = await storageRequest("/bucket", { method: "GET" });
if (!Array.isArray(existing)) {
  throw new Error("Storage API returned an invalid bucket list.");
}

for (const config of buckets) {
  const current = existing.find(
    (bucket) => bucket?.id === config.id || bucket?.name === config.id,
  );

  if (!current) {
    await storageRequest("/bucket/", {
      method: "POST",
      body: JSON.stringify({
        id: config.id,
        name: config.id,
        public: false,
        file_size_limit: config.file_size_limit,
        allowed_mime_types: config.allowed_mime_types,
      }),
    });
    console.info(`Created private Supabase bucket: ${config.id}`);
    continue;
  }

  await storageRequest(`/bucket/${encodeURIComponent(config.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      public: false,
      file_size_limit: config.file_size_limit,
      allowed_mime_types: config.allowed_mime_types,
    }),
  });
  console.info(`Verified private Supabase bucket: ${config.id}`);
}
