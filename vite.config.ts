import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Makes CSS non-render-blocking by using the media="print" async-load trick.
 * Combined with inline critical CSS in index.html, this allows FCP from the
 * loading spinner without waiting for the full stylesheet.
 */
function asyncCssPlugin(): Plugin {
  return {
    name: 'async-css',
    enforce: 'post',
    transformIndexHtml(html) {
      const noscripts: string[] = [];
      const transformed = html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        (_, href) => {
          noscripts.push(`<link rel="stylesheet" href="${href}">`);
          return `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">`;
        }
      );
      // <noscript> with <link> is INVALID inside <head> for HTML5 — inject in <body>
      if (noscripts.length === 0) return transformed;
      return transformed.replace(
        /<body([^>]*)>/,
        `<body$1><noscript>${noscripts.join('')}</noscript>`
      );
    },
  };
}

// https://vitejs.dev/config/ 
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    asyncCssPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['framer-motion', 'sonner', 'cmdk'],
          'vendor-supabase': ['@supabase/supabase-js'],
          
        },
      },
    },
  },
}));
