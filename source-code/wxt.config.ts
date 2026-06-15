import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifest: ({ browser }) => ({
    name: "Pinnit",
    description: "Pin comments on any webpage",
    version: "0.1.0",
    author: "Marouane",
    permissions: ["storage", "identity", "contextMenus", "activeTab"],
    host_permissions: ["https://*.supabase.co/*"],
    icons: {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png",
    },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "pinnit@marouane",
          data_collection_permissions: {
            required: ["personalCommunications"],
            optional: ["technicalAndInteraction"],
          },
        },
      },
      background: {
        service_worker: "background.js",
        scripts: ["background.js"],
      },
    }),
  }),
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
