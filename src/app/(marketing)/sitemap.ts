import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "https://petra-lms.vercel.app";
  return ["", "/about", "/programs", "/admissions", "/apply", "/book-visit", "/contact", "/updates", "/login"].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === "" || path === "/updates" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/apply" ? 0.9 : 0.7,
  }));
}
