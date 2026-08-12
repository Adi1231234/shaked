import { defineConfig } from "vite";
import { appConfig } from "@shaked/vite-preset";

const server = { host: "127.0.0.1", port: 5180, strictPort: true };

export default defineConfig(
  appConfig({
    base: "/shaked/song/",
    overrides: { server, preview: { ...server, allowedHosts: true } },
  }),
);
