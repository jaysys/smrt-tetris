import type { MetadataRoute } from "next";
import { buildAbsoluteUrl } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: buildAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    }
  ];
}
