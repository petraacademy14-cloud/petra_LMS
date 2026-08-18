/**
 * Builds server-only authentication headers for Supabase Storage.
 *
 * Legacy `service_role` keys are JWTs and must be sent as a Bearer token.
 * New `sb_secret_...` keys are opaque API keys and must not be used as a
 * Bearer token; Supabase authenticates them through the `apikey` header.
 */
export function supabaseStorageAdminHeaders(
  secret: string,
  additionalHeaders: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    apikey: secret,
  };

  if (!secret.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${secret}`;
  }

  return {
    ...headers,
    ...additionalHeaders,
  };
}

