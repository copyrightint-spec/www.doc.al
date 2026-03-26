import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/settings/", "/sign/"],
      },
      {
        userAgent: "GPTBot",
        allow: [
          "/",
          "/si-funksionon",
          "/explorer",
          "/verify",
          "/certificates",
          "/standards",
          "/contact",
          "/terms",
        ],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
      },
    ],
    sitemap: "https://www.doc.al/sitemap.xml",
  };
}
