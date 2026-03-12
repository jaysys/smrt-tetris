import type { MetadataRoute } from "next";
import { defaultDescription, siteName } from "./seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "SMRT Tetris",
    description: defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#101631",
    theme_color: "#101631",
    lang: "ko-KR"
  };
}
