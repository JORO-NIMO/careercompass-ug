import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Allow using process in this config without adding @types/node to the repo
declare const process: any;

// https://vitejs.dev/config/
export default defineConfig(({ mode }: { mode: string }) => {
  const strip = process.env.VITE_STRIP_VENDOR_SCRIPTS === 'true';

  const stripPlugin = {
    name: 'vite-strip-vendor-script',
    transformIndexHtml(html: string) {
      if (!strip) return html;
      // Remove any <script ... data-strip>...</script> occurrences
      return html.replace(/<script\b[^>]*data-strip[^>]*>[\s\S]*?<\/script>/gi, '');
    }
  };

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      stripPlugin,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src"),
      },
    },
  };
});
