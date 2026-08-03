import { PETRA_LOGO_WEBP } from "@/lib/brand-logo/official-logo";

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  return new Response(new Uint8Array(PETRA_LOGO_WEBP), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(PETRA_LOGO_WEBP.byteLength),
      "Content-Type": "image/webp",
    },
  });
}
