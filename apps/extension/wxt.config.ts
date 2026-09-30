import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    description:
      "Capture bugs with screen recording, console and network logs, saved to your Google Drive.",
    host_permissions: ["<all_urls>"],
    name: "Zam",
    permissions: ["offscreen", "scripting", "storage"],
  },
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
