import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "https://petra-lms.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/apply/status"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
