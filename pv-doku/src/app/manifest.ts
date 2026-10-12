import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PV-Anlagen-Dokumentation",
    short_name: "PV-Doku",
    description: "Dokumentation installierter Photovoltaikanlagen vor Ort und im Büro",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#101b26",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
