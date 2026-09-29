import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Two entry points: the public site (index.html) and the admin panel (admin.html).
// In dev, /api and /uploads are proxied to the Express server on port 8000.
export default defineConfig({
  root: "client",
  plugins: [
    react(),
    {
      name: "admin-history-fallback",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (/^\/admin(\/[^.]*)?(\?.*)?$/.test(req.url)) req.url = "/admin.html";
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8000", "/uploads": "http://localhost:8000" }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "static",
    rollupOptions: {
      input: { main: resolve(__dirname, "client/index.html"), admin: resolve(__dirname, "client/admin.html") }
    }
  }
});
