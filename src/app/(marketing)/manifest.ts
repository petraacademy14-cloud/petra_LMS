import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Petra Academy",
    short_name: "Petra",
    description: "Petra Academy website, admissions and school portals.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#a50e12",
    icons: [
      {
        src: "/brand/petra-logo.webp",
        sizes: "384x384",
        type: "image/webp",
        purpose: "any",
      },
    ],
  };
}
