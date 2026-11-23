import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
    proxy: {
      "/api": process.env.ACH_API_TARGET ?? "http://127.0.0.1:3100",
      "/mcp": process.env.ACH_API_TARGET ?? "http://127.0.0.1:3100",
    },
  },
});
