import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const base = isGitHubPages ? "/pedido-cierre/" : "/";

export default defineConfig({
  base,
  plugins: [
    tanstackStart({
      spa: {
        enabled: isGitHubPages,
      },
      server: {
        entry: "./src/server.ts",
      },
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
