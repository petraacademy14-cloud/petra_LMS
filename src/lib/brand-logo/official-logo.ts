import { part01 } from "@/lib/brand-logo/part-01";
import { part02 } from "@/lib/brand-logo/part-02";
import { part03 } from "@/lib/brand-logo/part-03";
import { part04 } from "@/lib/brand-logo/part-04";
import { part05 } from "@/lib/brand-logo/part-05";
import { part06 } from "@/lib/brand-logo/part-06";
import { part07 } from "@/lib/brand-logo/part-07";

const encodedLogo = part01 + part02 + part03 + part04 + part05 + part06 + part07;

export const PETRA_LOGO_WEBP = Buffer.from(encodedLogo, "base64");
