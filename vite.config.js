import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base שונה ב-build כדי לעבוד תחת GitHub Pages:
// https://adi1231234.github.io/spotify-song-site/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/spotify-song-site/" : "/",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5180, strictPort: true },
  preview: { host: "127.0.0.1", port: 5180, strictPort: true, allowedHosts: true },
}));
