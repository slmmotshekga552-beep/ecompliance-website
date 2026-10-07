// @lovable.dev/vite-tanstack-config already includes the required plugins.
// Do not add TanStack Start, React, Tailwind, Nitro, or other plugins manually.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Use the custom server entry during the build.
    server: {
      entry: "server",
    },

    // Generate static HTML for GitHub Pages.
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      crawlLinks: true,
      failOnError: true,
    },
  },

  vite: {
    // The custom domain is served from the root path.
    base: "/",
  },
});
