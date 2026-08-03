import { part01 } from "@/lib/brand-logo/part-01";
import { part02 } from "@/lib/brand-logo/part-02";
import { part03 } from "@/lib/brand-logo/part-03";
import { part04 } from "@/lib/brand-logo/part-04";
import { part05 } from "@/lib/brand-logo/part-05";
import { part06 } from "@/lib/brand-logo/part-06";
import { part07 } from "@/lib/brand-logo/part-07";

export const dynamic = "force-static";
export const runtime = "nodejs";

const encodedLogo = part01 + part02 + part03 + part04 + part05 + part06 + part07;
const logo = Buffer.from(encodedLogo, "base64");

export function GET() {
  return new Response(new Uint8Array(logo), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(logo.byteLength),
      "Content-Type": "image/webp",
    },
  });
}
