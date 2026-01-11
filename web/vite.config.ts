import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// Read version from server
let VERSION = "unknown";
let BUILD_TIME = new Date().toISOString();
try {
  const versionFile = readFileSync("../server/src/version.ts", "utf-8");
  const versionMatch = versionFile.match(/export const VERSION = "([^"]+)"/);
  if (versionMatch) VERSION = versionMatch[1];
} catch (e) {
  console.warn("Could not read version file, using default");
}

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    {
      name: "inject-version",
      transformIndexHtml(html) {
        return html
          .replace(/BUILD_VERSION_PLACEHOLDER/g, VERSION)
          .replace(/BUILD_TIME_PLACEHOLDER/g, BUILD_TIME);
      }
    }
  ],
  server: { port: 5173 },
  define: {
    __BUILD_VERSION__: JSON.stringify(VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME)
  }
});
