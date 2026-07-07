import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PersonalMax",
    short_name: "PersonalMax",
    description:
      "Log workouts, follow your plan, fuel up, and level a character built from your real training.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0a12",
    theme_color: "#0b0a12",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
