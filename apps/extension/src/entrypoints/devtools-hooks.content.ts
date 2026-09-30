import { installDevtoolsHooks } from "@/entities/devtools-log";

export default defineContentScript({
  main() {
    installDevtoolsHooks();
  },
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
});
