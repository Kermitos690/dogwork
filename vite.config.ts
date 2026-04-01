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
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        '<link rel="stylesheet" href="$1" media="print" onload="this.media=\'all\'">' +
        '<noscript><link rel="stylesheet" href="$1"></noscript>'
      );
    },
  };
}

// https://vitejs.dev/config/ 
export default defineConfig(({ mode }) => ({
  define: {
    // Hard-pin Supabase to the correct (enriched) instance.
    // This overrides any Live-environment variables injected by the platform.
    // Remove this block once Lovable Cloud Live binding is fixed.
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://dcwbqsfeouvghcnvhrpj.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjd2Jxc2Zlb3V2Z2hjbnZocnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzkxMDcsImV4cCI6MjA4ODgxNTEwN30.wF0VlmMKVqeJOo2q3GlWVzl1-EyYMd3-i2YDhYBKfog'),
  },
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
